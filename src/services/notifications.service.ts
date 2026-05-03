import notificationRepository from "@/repositories/notifications.repository";
import { NotificationInsert, NotificationQueryAll, NotificationType, NotificationUpdate } from "@/types/common";
import { BadRequestError } from "@/utils/errors";
import validate from "@/utils/validate";
import _ from "lodash";
import { MessageUtil } from "@/utils/MessageUtil";
import { getIO } from "@/websockets/chat.socket";
import { EmailService } from "./email.service";
import userRepository from "@/repositories/user.repository";

export class NotificationService {
  async findAll(input: NotificationQueryAll) {
    return await notificationRepository.findAll(input);
  }

  async findOne(input: { id: number }) {
    return await notificationRepository.findOne(input.id);
  }

  async update(input: { query: NotificationQueryAll, data: NotificationUpdate }) {
    return await notificationRepository.update(input.query, input.data);
  }

  async create(input: { data: NotificationInsert }) {
    const { data } = input;

    const notification_type = _.get(data, 'type');

    if (!validate.valid_enum(NotificationType, notification_type)) {
        throw new BadRequestError({ message: MessageUtil.get("INVALID_NOTIFICATION_TYPE") });
    }

    const notification = await notificationRepository.create({
      data: data,
    });

    // Real-time update via Socket.io
    const io = getIO();
    if (io && notification.receiver_id) {
      const room = `user_${notification.receiver_id}`;
      io.to(room).emit("new_notification", notification);
    }

    // Send Email notification
    if (notification.receiver_id) {
      try {
        const user = await userRepository.findOne({ 
          user_id: notification.receiver_id, 
          fields: "email, first_name, last_name" 
        });

        if (user && user.email) {
          // Determine action URL based on type
          let actionUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          if (notification.type === NotificationType.NewChatMessage) {
             actionUrl += "/chat";
          } else if (notification.type === NotificationType.NewApplication || notification.type === NotificationType.ApplicationStatusUpdated) {
             actionUrl += "/manage/applications";
          }

          EmailService.sendNotificationEmail({
            email: user.email,
            title: notification.title || "Thông báo mới từ SEJobs",
            content: notification.content || "",
            actionUrl,
            actionText: "Xem trên SEJobs"
          }).catch(err => console.error("Error sending notification email:", err));
        }
      } catch (error) {
        console.error("Error fetching user for email notification:", error);
      }
    }

    return notification;
  }

  async delete(id: number) {
    return await notificationRepository.delete(id);
  }
}

export default new NotificationService();

