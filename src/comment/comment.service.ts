import { Injectable, NotFoundException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private readonly gateway: AppGateway,
    private readonly userService: UserService,
    private readonly notificationService?: NotificationService,
  ) { }

  // create comment or reply
  async create(userId: string, dto: CreateCommentDto): Promise<Comment> {
    // Sanitize HTML content to prevent XSS
    const sanitizedContent = sanitizeHtml(dto.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['u']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
      },
    });
    const newComment = new this.commentModel({
      ...dto,
      content: sanitizedContent,
      authorId: userId,
    });
    const saved = await newComment.save();

    // Get author information for better display
    let authorName = userId; // fallback to ID
    try {
      const author = await this.userService.findById(userId);
      authorName = author.username;
    } catch (e) {
      console.warn('Could not fetch author info:', e.message);
    }

    const payload = {
      _id: saved._id,
      postId: saved.postId,
      parentId: saved.parentId ?? null,
      content: saved.content,
      authorId: saved.authorId,
      authorName, // Add username for display
    };

    // If reply, notify parent author only
    try {
      if (saved.parentId) {
        const parent = await this.commentModel.findById(saved.parentId).lean();
        if (parent && parent.authorId !== userId) {
          // notify parent author (emit & optional persistence elsewhere)
          this.gateway.emitToUser(parent.authorId, 'replyAdded', { ...payload, replyTo: parent._id });
        }
      }
      // Emit to post room for all viewers (so threads update)
      this.gateway.emitToPost(saved.postId, 'commentAdded', payload);
    } catch (err) {
      console.error('Failed to emit WS event', err);
    }

    return saved;
  }

  // flat fetch
  async findByPost(postId: string): Promise<Comment[]> {
    const docs = await this.commentModel.find({ postId }).sort({ createdAt: -1 }).lean().exec();
    
    // Enhance comments with author names
    const enhancedDocs = await Promise.all(
      docs.map(async (doc) => {
        let authorName = doc.authorId; // fallback to ID
        try {
          const author = await this.userService.findById(doc.authorId);
          authorName = author.username;
        } catch (e) {
          console.warn('Could not fetch author info for comment:', doc._id, e.message);
        }
        return { ...doc, authorName };
      })
    );
    
    return enhancedDocs;
  }

  // threaded fetch
  async findThreadedByPost(postId: string) {
    const docs = await this.commentModel.find({ postId }).sort({ createdAt: 1 }).lean().exec();
    
    // Enhance comments with author names
    const enhancedDocs = await Promise.all(
      docs.map(async (doc) => {
        let authorName = doc.authorId; // fallback to ID
        try {
          const author = await this.userService.findById(doc.authorId);
          authorName = author.username;
        } catch (e) {
          console.warn('Could not fetch author info for comment:', doc._id, e.message);
        }
        return { ...doc, authorName };
      })
    );
    
    // build map
    const map = new Map<string, any>();
    const roots: any[] = [];
    for (const d of enhancedDocs) {
      map.set(d._id.toString(), { ...d, children: [] });
    }
    for (const d of enhancedDocs) {
      const node = map.get(d._id.toString());
      if (d.parentId) {
        const pid = d.parentId.toString();
        const parent = map.get(pid);
        if (parent) parent.children.push(node);
        else roots.push(node); // parent missing, treat as root
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findById(id: string): Promise<Comment> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  async toggleLike(userId: string, commentId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    const alreadyLiked = comment.likes?.some((id) => id.toString() === userId.toString());

    let updated;
    if (alreadyLiked) {
      updated = await this.commentModel.findByIdAndUpdate(commentId, { $pull: { likes: userId } }, { new: true }).lean();
      // emit updated counts to room
      try {
        this.gateway.emitToPost(comment.postId, 'commentLiked', { commentId, totalLikes: updated.likes.length, liked: false, userId });
      } catch (e) { console.error(e); }
      return { liked: false, totalLikes: updated.likes.length };
    } else {
      updated = await this.commentModel.findByIdAndUpdate(commentId, { $addToSet: { likes: userId } }, { new: true }).lean();

      // Create notification for comment author (if not self)
      if (comment.authorId.toString() !== userId.toString()) {
        let notif;
        if (this.notificationService) {
          notif = await this.notificationService.create({
            toUser: comment.authorId as any,
            fromUser: userId as any,
            type: 'like',
            commentId: comment._id as any,
            postId: comment.postId,
          });
          // emit notification to the comment author (real-time)
          try {
            this.gateway.emitToUser(comment.authorId.toString(), 'notification', notif);
          } catch (e) { console.error(e); }
        }
      }

      // emit updated counts to the post room
      try {
        this.gateway.emitToPost(comment.postId, 'commentLiked', { commentId, totalLikes: updated.likes.length, liked: true, userId });
      } catch (e) { console.error(e); }

      return { liked: true, totalLikes: updated.likes.length };
    }
  }
}