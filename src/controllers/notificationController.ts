import type { Response } from "express";
import { Notification, type NotificationDoc } from "../models/Notification.js";
import type { AuthedRequest } from "../middleware/auth.js";

function serialize(notification: NotificationDoc) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

export async function listNotifications(req: AuthedRequest, res: Response) {
  const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.userId, read: false });

  return res.json({
    notifications: notifications.map(serialize),
    unreadCount,
  });
}

export async function markNotificationRead(req: AuthedRequest, res: Response) {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.userId });
  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  notification.read = true;
  await notification.save();

  return res.json({ notification: serialize(notification) });
}

export async function markAllNotificationsRead(req: AuthedRequest, res: Response) {
  await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
  return res.status(204).send();
}
