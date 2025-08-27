import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AppGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  @WebSocketServer()
  server: Server; // <-- Nest injects real Socket.IO server here

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify(token);
      const userId = payload.sub?.toString();
      if (!userId) throw new Error('Invalid payload');

      client.data.userId = userId;
      const set = this.userSockets.get(userId) ?? new Set();
      set.add(client.id);
      this.userSockets.set(userId, set);

      this.logger.log(`WS connected: user=${userId}, socket=${client.id}`);
    } catch (err) {
      this.logger.warn(`Socket auth failed: ${err?.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const set = this.userSockets.get(userId);
    if (!set) return;
    set.delete(client.id);
    if (set.size === 0) this.userSockets.delete(userId);

    this.logger.log(`WS disconnected: user=${userId}, socket=${client.id}`);
  }

  // join/leave rooms
  @SubscribeMessage('joinPost')
  handleJoinPost(@MessageBody() data: { postId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.postId) return;
    client.join(`post:${data.postId}`);
    this.logger.log(`user=${client.data.userId} joined post:${data.postId}`);
    return { ok: true };
  }

  @SubscribeMessage('leavePost')
  handleLeavePost(@MessageBody() data: { postId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.postId) return;
    client.leave(`post:${data.postId}`);
    this.logger.log(`user=${client.data.userId} left post:${data.postId}`);
    return { ok: true };
  }

  // helpers
  emitToUser(userId: string, event: string, payload: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    for (const sid of sockets) {
      this.server.to(sid).emit(event, payload);
    }
  }

  emitToPost(postId: string, event: string, payload: any) {
    this.server.to(`post:${postId}`).emit(event, payload);
  }

  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
