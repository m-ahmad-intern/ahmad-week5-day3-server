import { Controller, Get, Param, UseGuards, Request, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // public profile (if Authorization provided, we can add isFollowing)
  @Get(':id')
  async getProfile(@Param('id') id: string, @Request() req) {
    const profile = await this.userService.findById(id);
    if (req?.user?.userId) {
      const isFollowing = await this.userService.isFollowing(req.user.userId, id);
      return { ...profile, isFollowing };
    }
    return profile;
  }

  // toggle follow/unfollow (auth required)
  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async toggleFollow(@Param('id') id: string, @Request() req) {
    return this.userService.toggleFollow(req.user.userId, id);
  }
}
