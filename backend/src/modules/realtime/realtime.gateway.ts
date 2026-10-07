import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { WS_NAMESPACE, WS_ROOMS } from '../../common/constants/app.constants';
import { UserStatus } from '../../common/constants/enums';
import { JwtAccessPayload } from '../../common/types/auth.types';
import { Doctor } from '../doctors/entities/doctor.entity';
import { User } from '../users/entities/user.entity';

/**
 * Socket.IO gateway. Anonymous sockets only join the public `board` room (queue screen);
 * authenticated sockets join role / user / doctor rooms. CORS is configured by the adapter in main.ts.
 */
@WebSocketGateway({ namespace: WS_NAMESPACE })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
  ) {}

  afterInit(): void {
    this.logger.log(`Realtime gateway ready on namespace ${WS_NAMESPACE}`);
  }

  async handleConnection(client: Socket): Promise<void> {
    await client.join(WS_ROOMS.BOARD);
    const token = this.extractToken(client);
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token);
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user || user.status !== UserStatus.ACTIVE) return;
      const rooms = [WS_ROOMS.role(user.role), WS_ROOMS.user(user.id)];
      const doctor = await this.doctors.findOne({ where: { userId: user.id } });
      if (doctor) rooms.push(WS_ROOMS.doctor(doctor.id));
      await client.join(rooms);
      client.data.userId = user.id;
    } catch {
      // Invalid/expired token → socket stays anonymous (board only).
      client.emit('auth:error', { message: 'Invalid or expired token' });
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    if (auth && typeof auth.token === 'string' && auth.token) return auth.token;
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
