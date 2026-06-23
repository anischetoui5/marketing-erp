import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const SAFE_CLIENT_SELECT = {
  id: true,
  company_name: true,
  contact_name: true,
  contact_email: true,
  phone: true,
  industry: true,
  notes: true,
  is_archived: true,
  created_at: true,
  updated_at: true,
};

const SAFE_CLIENT_USER_SELECT = {
  id: true,
  client_id: true,
  email: true,
  full_name: true,
  is_active: true,
  created_at: true,
};

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateClientDto, actorId: string, actorEmail: string) {
    const client = await this.prisma.clients.create({
      data: {
        company_name: dto.companyName,
        contact_name: dto.contactName,
        contact_email: dto.contactEmail,
        phone: dto.phone,
        industry: dto.industry,
        notes: dto.notes,
      },
      select: SAFE_CLIENT_SELECT,
    });

    await this.auditLogService.log({
      actorId,
      actorEmail,
      action: 'clients.create',
      entityType: 'client',
      entityId: client.id,
      newState: { companyName: dto.companyName },
    });

    return client;
  }

  async findAll(
    page: number,
    limit: number,
    archived: boolean,
    search?: string,
  ) {
    const where: Record<string, unknown> = { is_archived: archived };

    if (search) {
      where['OR'] = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { contact_name: { contains: search, mode: 'insensitive' } },
        { contact_email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.clients.count({ where }),
      this.prisma.clients.findMany({
        where,
        select: SAFE_CLIENT_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const client = await this.prisma.clients.findUnique({
      where: { id },
      select: SAFE_CLIENT_SELECT,
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    actorId: string,
    actorEmail: string,
  ) {
    const existing = await this.prisma.clients.findUnique({
      where: { id },
      select: SAFE_CLIENT_SELECT,
    });
    if (!existing) throw new NotFoundException('Client not found');

    const updated = await this.prisma.clients.update({
      where: { id },
      data: {
        ...(dto.companyName !== undefined
          ? { company_name: dto.companyName }
          : {}),
        ...(dto.contactName !== undefined
          ? { contact_name: dto.contactName }
          : {}),
        ...(dto.contactEmail !== undefined
          ? { contact_email: dto.contactEmail }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isArchived !== undefined
          ? { is_archived: dto.isArchived }
          : {}),
      },
      select: SAFE_CLIENT_SELECT,
    });

    await this.auditLogService.log({
      actorId,
      actorEmail,
      action: 'clients.update',
      entityType: 'client',
      entityId: id,
      previousState: existing,
      newState: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async createClientUser(
    clientId: string,
    email: string,
    fullName: string,
    actorId: string,
    actorEmail: string,
  ) {
    const client = await this.prisma.clients.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Client not found');

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const clientUser = await this.prisma.client_users.create({
      data: {
        client_id: clientId,
        email,
        full_name: fullName,
        invitation_token: invitationToken,
        invitation_expires_at: invitationExpiresAt,
      },
      select: SAFE_CLIENT_USER_SELECT,
    });

    this.logger.log(
      `Portal invitation for ${email}: /portal/accept-invitation?token=${invitationToken}`,
    );

    await this.auditLogService.log({
      actorId,
      actorEmail,
      action: 'clients.create_user',
      entityType: 'client_user',
      entityId: clientUser.id,
      newState: { email, clientId },
    });

    return clientUser;
  }

  async findClientUsers(clientId: string) {
    const client = await this.prisma.clients.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Client not found');

    return this.prisma.client_users.findMany({
      where: { client_id: clientId },
      select: SAFE_CLIENT_USER_SELECT,
    });
  }
}
