import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    // add followerCount
    return { ...user, followerCount: (user.followers || []).length };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async createUser(username: string, email: string, passwordHash: string): Promise<User> {
    const exists = await this.userModel.findOne({ $or: [{ username }, { email }] });
    if (exists) throw new BadRequestException('Username or email already in use');
    const user = new this.userModel({ username, email, passwordHash });
    return user.save();
  }

  // toggle follow/unfollow
  async toggleFollow(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) throw new BadRequestException("Can't follow yourself");

    const current = await this.userModel.findById(currentUserId);
    const target = await this.userModel.findById(targetUserId);
    if (!current || !target) throw new NotFoundException('User not found');

    const isFollowing = (current.following || []).some((id) => id === targetUserId);

    if (isFollowing) {
      // unfollow
      await this.userModel.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
      await this.userModel.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
      return { following: false, followerCount: Math.max(0, (target.followers || []).length - 1) };
    } else {
      // follow
      await this.userModel.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
      await this.userModel.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
      const updatedTarget = await this.userModel.findById(targetUserId).lean();
      return { following: true, followerCount: (updatedTarget? updatedTarget.followers : []).length };
    }
  }

  // check relationship (helper for profile endpoint)
  async isFollowing(currentUserId: string, targetUserId: string) {
    const current = await this.userModel.findById(currentUserId).lean();
    if (!current) return false;
    return (current.following || []).includes(targetUserId);
  }
}
