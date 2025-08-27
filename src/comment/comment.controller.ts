import { Body, Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCommentDto, @Request() req) {
    return this.commentService.create(req.user.userId, dto);
  }

  // flat list (existing)
  @Get()
  async getComments(@Query('postId') postId: string) {
    return this.commentService.findByPost(postId);
  }

  // threaded list: GET /comments/threaded?postId=...
  @Get('threaded')
  async getThreaded(@Query('postId') postId: string) {
    return this.commentService.findThreadedByPost(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async toggleLike(@Param('id') id: string, @Request() req) {
    return this.commentService.toggleLike(req.user.userId, id);
  }
}
