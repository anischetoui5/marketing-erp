import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  department: true,
  is_active: true,
  timezone: true,
  created_at: true,
  updated_at: true,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    dto: CreateUserDto,
    actorId: string,
    actorEmail: string,
    actorRole: string,
  ) {
    // Scope: managers can only create their own agent type
    if (actorRole === 'marketing_manager' && dto.role !== 'marketing_agent') {
      throw new ForbiddenException(
        'Marketing manager can only create marketing agents',
      );
    }
    if (actorRole === 'production_manager' && dto.role !== 'production_agent') {
      throw new ForbiddenException(
        'Production manager can only create production agents',
      );
    }

    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        full_name: dto.fullName,
        role: dto.role,
        department: dto.department,
        invitation_token: invitationToken,
        invitation_expires_at: invitationExpiresAt,
      },
      select: SAFE_USER_SELECT,
    });

    this.logger.log(
      `Invitation link for ${dto.email}: /accept-invitation?token=${invitationToken}`,
    );

    await this.auditLogService.log({
      actorId,
      actorEmail,
      action: 'users.create',
      entityType: 'user',
      entityId: user.id,
      newState: { email: dto.email, role: dto.role },
    });

    return {
      ...user,
      invitationPath: `/accept-invitation?token=${invitationToken}`,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const user = await this.prisma.users.findFirst({
      where: {
        invitation_token: dto.token,
        invitation_expires_at: { gt: new Date() },
      },
    });

    if (!user)
      throw new BadRequestException('Invalid or expired invitation token');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        invitation_token: null,
        invitation_expires_at: null,
      },
    });

    return { message: 'Account activated' };
  }

  async findAll(page: number, limit: number, actorRole: string) {
    const roleFilter =
      actorRole === 'marketing_manager'
        ? { role: 'marketing_agent' as const }
        : actorRole === 'production_manager'
          ? { role: 'production_agent' as const }
          : {};

    const [total, items] = await Promise.all([
      this.prisma.users.count({ where: roleFilter }),
      this.prisma.users.findMany({
        where: roleFilter,
        select: SAFE_USER_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
    actorEmail: string,
  ) {
    if (dto.isActive === false && id === actorId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const existing = await this.prisma.users.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!existing) throw new NotFoundException('User not found');

    if (dto.isActive === false) {
      await this.prisma.refresh_tokens.updateMany({
        where: { user_id: id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    const updated = await this.prisma.users.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { full_name: dto.fullName } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      },
      select: SAFE_USER_SELECT,
    });

    await this.auditLogService.log({
      actorId,
      actorEmail,
      action: 'users.update',
      entityType: 'user',
      entityId: id,
      previousState: existing,
      newState: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
