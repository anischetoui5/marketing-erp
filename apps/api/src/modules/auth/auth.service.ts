import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 10;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.locked_until && user.locked_until > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!passwordValid) {
      const newAttempts = user.failed_login_attempts + 1;
      const updateData: Parameters<typeof this.prisma.users.update>[0]['data'] = {
        failed_login_attempts: newAttempts,
      };

      if (newAttempts >= LOCKOUT_MAX_ATTEMPTS) {
        const windowAgo = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
        if (!user.updated_at || user.updated_at > windowAgo) {
          updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
          this.logger.warn(`Account locked for user ${user.email}`);
        }
      }

      await this.prisma.users.update({ where: { id: user.id }, data: updateData });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, locked_until: null },
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, user.department ?? undefined);

    await this.auditLogService.log({
      actorId: user.id,
      actorType: 'user',
      actorEmail: user.email,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refresh_tokens.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    return this.generateTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      stored.user.department ?? undefined,
    );
  }

  async logout(userId: string, refreshToken?: string, ipAddress?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refresh_tokens.updateMany({
        where: { token_hash: tokenHash, user_id: userId },
        data: { revoked_at: new Date() },
      });
    } else {
      await this.prisma.refresh_tokens.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    const user = await this.prisma.users.findUnique({ where: { id: userId }, select: { email: true } });

    await this.auditLogService.log({
      actorId: userId,
      actorType: 'user',
      actorEmail: user?.email,
      action: 'auth.logout',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        department: true,
        timezone: true,
        created_at: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      department: user.department,
      timezone: user.timezone,
      createdAt: user.created_at.toISOString(),
    };
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    department?: string,
  ) {
    const payload = { sub: userId, email, role, department };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const expiresAt = this.parseExpiry(expiresIn);

    await this.prisma.refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): Date {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const ms =
      unit === 'd' ? value * 24 * 60 * 60 * 1000 :
      unit === 'h' ? value * 60 * 60 * 1000 :
      unit === 'm' ? value * 60 * 1000 :
      value * 1000;
    return new Date(Date.now() + ms);
  }
}
