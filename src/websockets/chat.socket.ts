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

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173", 
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
      ],
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use((socket, next) => {
    // Extract token from cookies (same as Express auth middleware)
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

    // Also check auth header as fallback
    if (!token) {
      token = socket.handshake.auth?.token;
    }

    if (!token) {
      logger.warn("Socket auth failed: no token found in cookies or auth");
      return next(new Error("Authentication error"));
    }
    
    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (err) {
      logger.warn("Socket auth failed: invalid token");
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.user.userId;
    logger.info(`🔌 User connected to chat socket: ${userId}`);
    console.log(`Socket user ${userId} joining room user_${userId}`);

    // Join a room specifically for this user to receive messages
    const roomName = `user_${userId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room ${roomName}. Current rooms:`, Array.from(socket.rooms));

    // Send Message Event
    socket.on("send_message", async (payload: ChatMessagePayload) => {
      logger.info(`Message received from ${userId} to ${payload.receiverId} in conv ${payload.conversationId}`);
      console.log("📥 Received message payload:", payload);
      try {
        // Save to Database
        const { data: msg, error } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: payload.conversationId,
            sender_id: userId,
            content: payload.content,
          })
          .select("*")
          .single();

        if (error) throw error;

        // Broadcast to receiver
        const room = `user_${payload.receiverId}`;
        const sockets = await io.in(room).fetchSockets();
        console.log(`Broadcasting to room ${room}. Found ${sockets.length} sockets in that room.`);
        
        io.to(room).emit("receive_message", msg);
        
        // Also echo back to sender to confirm (or they can rely on REST)
        socket.emit("receive_message", msg);
        
      } catch (err) {
        logger.error(`Error saving message: ${err}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`🔌 User disconnected: ${userId}`);
    });
  });

  return io;
}
