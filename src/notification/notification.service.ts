import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';

@Injectable()
export class NotificationService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<Notification>) {}

  async create(n: Partial<Notification>) {
    const created = new this.notificationModel(n);
    return created.save();
  }

  async findForUser(userId: string, limit = 50) {
    return this.notificationModel
      .find({ toUser: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async markRead(id: string, userId: string) {
    // Only allow the recipient to mark as read
    return this.notificationModel.findOneAndUpdate(
      { _id: id, toUser: userId },
      { $set: { read: true } },
      { new: true },
    );
  }
}
