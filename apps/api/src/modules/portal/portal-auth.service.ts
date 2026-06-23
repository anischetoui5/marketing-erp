import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 10;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(email: string, password: string, ipAddress?: string) {
    const clientUser = await this.prisma.client_users.findUnique({
      where: { email },
    });

    if (!clientUser || !clientUser.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (clientUser.locked_until && clientUser.locked_until > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    const passwordValid = await bcrypt.compare(
      password,
      clientUser.password_hash,
    );

    if (!passwordValid) {
      const newAttempts = clientUser.failed_login_attempts + 1;
      const updateData: { failed_login_attempts: number; locked_until?: Date } =
        {
          failed_login_attempts: newAttempts,
        };

      if (newAttempts >= LOCKOUT_MAX_ATTEMPTS) {
        const windowAgo = new Date(
          Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000,
        );
        if (!clientUser.updated_at || clientUser.updated_at > windowAgo) {
          updateData.locked_until = new Date(
            Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
          );
          this.logger.warn(`Client account locked for ${clientUser.email}`);
        }
      }

      await this.prisma.client_users.update({
        where: { id: clientUser.id },
        data: updateData,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.client_users.update({
      where: { id: clientUser.id },
      data: { failed_login_attempts: 0, locked_until: null },
    });

    const tokens = await this.generateTokenPair(
      clientUser.id,
      clientUser.email,
      clientUser.client_id,
    );

    await this.auditLogService.log({
      actorId: clientUser.id,
      actorType: 'client_user',
      actorEmail: clientUser.email,
      action: 'portal.auth.login',
      entityType: 'client_user',
      entityId: clientUser.id,
      ipAddress,
    });

    return {
      ...tokens,
      user: {
        id: clientUser.id,
        email: clientUser.email,
        fullName: clientUser.full_name,
        clientId: clientUser.client_id,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.client_refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { client_user: true },
    });

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.client_refresh_tokens.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    return this.generateTokenPair(
      stored.client_user.id,
      stored.client_user.email,
      stored.client_user.client_id,
    );
  }

  async logout(clientUserId: string, ipAddress?: string) {
    await this.prisma.client_refresh_tokens.updateMany({
      where: { client_user_id: clientUserId, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    const clientUser = await this.prisma.client_users.findUnique({
      where: { id: clientUserId },
      select: { email: true },
    });

    await this.auditLogService.log({
      actorId: clientUserId,
      actorType: 'client_user',
      actorEmail: clientUser?.email,
      action: 'portal.auth.logout',
      entityType: 'client_user',
      entityId: clientUserId,
      ipAddress,
    });

    return { message: 'Logged out successfully' };
  }

  private async generateTokenPair(
    clientUserId: string,
    email: string,
    clientId: string,
  ) {
    const payload = { sub: clientUserId, email, clientId, type: 'client' };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = this.parseExpiry(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    );

    await this.prisma.client_refresh_tokens.create({
      data: {
        client_user_id: clientUserId,
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
      unit === 'd'
        ? value * 24 * 60 * 60 * 1000
        : unit === 'h'
          ? value * 60 * 60 * 1000
          : unit === 'm'
            ? value * 60 * 1000
            : value * 1000;
    return new Date(Date.now() + ms);
  }
}
