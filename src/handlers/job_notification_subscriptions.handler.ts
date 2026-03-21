import { Request, Response } from "express-serve-static-core";
import jobNotificationSubscriptionsRepository from "@/repositories/job_notification_subscriptions.repository";
import studentRepository from "@/repositories/student.repository";
import { NotFoundError } from "@/utils/errors";
import { MessageUtil } from "@/utils/MessageUtil";

/**
 * Get subscription status for current user
 */
export async function getSubscriptionStatus(req: Request, res: Response) {
  const userId = req.user!.userId;

  // Find student by user_id
  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  const subscription = await jobNotificationSubscriptionsRepository.findByStudentId(student.id);

  res.status(200).json({
    success: true,
    data: {
      is_subscribed: subscription?.is_active || false,
      subscription: subscription || null,
    },
  });
}

/**
 * Subscribe to job notifications
 */
export async function subscribe(req: Request, res: Response) {
  const userId = req.user!.userId;

  // Find student by user_id
  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  // Upsert subscription (create or update to active)
  const subscription = await jobNotificationSubscriptionsRepository.upsert({
    student_id: student.id,
    is_active: true,
  });

  res.status(200).json({
    success: true,
    message: MessageUtil.get("SUCCESSFULLY_SUBSCRIBED_TO_JOB_NOTIFICATIONS"),
    data: subscription,
  });
}

/**
 * Unsubscribe from job notifications
 */
export async function unsubscribe(req: Request, res: Response) {
  const userId = req.user!.userId;

  // Find student by user_id
  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  // Check if subscription exists
  const existing = await jobNotificationSubscriptionsRepository.findByStudentId(student.id);
  if (!existing) {
    res.status(200).json({
      success: true,
      message: MessageUtil.get("ALREADY_UNSUBSCRIBED"),
    });
    return;
  }

  // Update to inactive
  await jobNotificationSubscriptionsRepository.update(student.id, {
    is_active: false,
  });

  res.status(200).json({
    success: true,
    message: MessageUtil.get("SUCCESSFULLY_UNSUBSCRIBED_FROM_JOB_NOTIFICATIONS"),
  });
}

/**
 * Toggle subscription status
 */
export async function toggleSubscription(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { is_active } = req.body;

  // Find student by user_id
  const student = await studentRepository.findOne({ user_id: userId });
  if (!student) {
    throw new NotFoundError({ message: MessageUtil.get("STUDENT_PROFILE_NOT_FOUND") });
  }

  // Upsert subscription
  const subscription = await jobNotificationSubscriptionsRepository.upsert({
    student_id: student.id,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(200).json({
    success: true,
    message: `Job notifications ${subscription.is_active ? "enabled" : "disabled"}`,
    data: subscription,
  });
}
