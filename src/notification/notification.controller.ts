import { Controller, Get, UseGuards, Request, Post, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getNotifications(@Request() req) {
    return this.notificationService.findForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markRead(id, req.user.userId);
  }
}
