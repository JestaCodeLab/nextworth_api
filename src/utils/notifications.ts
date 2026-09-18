import { Notification, type NOTIFICATION_TYPES } from "../models/Notification.js";

export function createNotification(
  userId: string,
  type: (typeof NOTIFICATION_TYPES)[number],
  title: string,
  body: string,
) {
  return Notification.create({ userId, type, title, body });
}
