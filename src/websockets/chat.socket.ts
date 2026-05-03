import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import logger from "../utils/logger";
import { verifyToken } from "../utils/jwt.util";
import { supabase } from "../config/supabase";

export interface ChatMessagePayload {
  conversationId: number;
  receiverId: number;
  content: string;
}

let io: Server;

export function getIO() {
  return io;
}

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://sejobs.vercel.app"
      ],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    // ... existing auth logic ...
    const cookieHeader = socket.handshake.headers.cookie;
    let token: string | undefined;

    if (cookieHeader) {
      const cookies: Record<string, string> = {};
      for (const cookie of cookieHeader.split(";")) {
        const eqIndex = cookie.indexOf("=");
        if (eqIndex > 0) {
          const key = cookie.substring(0, eqIndex).trim();
          const val = cookie.substring(eqIndex + 1).trim();
          cookies[key] = val;
        }
      }
      token = cookies["access_token"];
    }

    if (!token) {
      token = socket.handshake.auth?.token;
    }

    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = verifyToken(token);
      const { default: userRepository } = await import("../repositories/user.repository");
      const user = await userRepository.findOne({ user_id: decoded.userId, fields: "user_id, is_active" });

      if (!user || user.is_active === false) {
        return next(new Error("Account is deactivated"));
      }

      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  const onlineUsers = new Map<number, Set<string>>();

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.user.userId;
    logger.info(`🔌 User connected to chat socket: ${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)?.add(socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));

    const roomName = `user_${userId}`;
    socket.join(roomName);

    socket.on("send_message", async (payload: ChatMessagePayload) => {
      try {
        const { data: msg, error } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: payload.conversationId,
            sender_id: userId,
            content: payload.content,
          })
          .select("*, sender:sender_id(first_name, last_name, avatar)")
          .single();

        if (error) throw error;

        // Broadcast to receiver
        const room = `user_${payload.receiverId}`;
        io.to(room).emit("receive_message", msg);
        socket.emit("receive_message", msg);

        // Trigger Notification
        const { default: notificationService } = await import("../services/notifications.service");
        const { NotificationType } = await import("../types/common");

        await notificationService.create({
          data: {
            type: NotificationType.NewChatMessage,
            receiver_id: payload.receiverId,
            sender_id: userId,
            title: "Tin nhắn mới",
            content: `${msg.sender?.first_name || ''} ${msg.sender?.last_name || 'Ai đó'} đã gửi cho bạn một tin nhắn`.trim(),
            status: "sent",
            data: {
              conversation_id: payload.conversationId,
              message_id: msg.id
            }
          }
        });

      } catch (err: any) {
        logger.error(`Error saving message: ${err.message || JSON.stringify(err)}`);
      }
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      io.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
}

