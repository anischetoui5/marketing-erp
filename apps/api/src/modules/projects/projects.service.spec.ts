import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

const mockPrisma = {
  clients: { findUnique: jest.fn() },
  projects: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project_users: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  tasks: { count: jest.fn() },
};

const mockAudit = { log: jest.fn() };

const adminActor = { sub: 'user-1', email: 'admin@test.com', role: 'admin' };
const managerActor = {
  sub: 'user-2',
  email: 'mgr@test.com',
  role: 'marketing_manager',
};
const agentActor = {
  sub: 'user-3',
  email: 'agent@test.com',
  role: 'marketing_agent',
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException when client does not exist', async () => {
      mockPrisma.clients.findUnique.mockResolvedValue(null);
      await expect(
        service.create(
          { clientId: 'bad-id', name: 'P', objective: 'awareness' as any },
          adminActor as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when client is archived', async () => {
      mockPrisma.clients.findUnique.mockResolvedValue({
        id: 'c1',
        is_archived: true,
      });
      await expect(
        service.create(
          { clientId: 'c1', name: 'P', objective: 'awareness' as any },
          adminActor as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create project when client is active', async () => {
      mockPrisma.clients.findUnique.mockResolvedValue({
        id: 'c1',
        is_archived: false,
      });
      mockPrisma.projects.create.mockResolvedValue({
        id: 'p1',
        name: 'Test',
        objective: 'awareness',
        status: 'draft',
        start_date: null,
        end_date: null,
        budget_total: null,
        budget_currency: 'USD',
        meta_ads_account_id: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        client: { id: 'c1', company_name: 'Acme' },
      });
      mockAudit.log.mockResolvedValue(undefined);

      const result = await service.create(
        { clientId: 'c1', name: 'Test', objective: 'awareness' as any },
        adminActor,
      );
      expect(result.id).toBe('p1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'project.created' }),
      );
    });
  });

  describe('agent scoping', () => {
    it('findAll — agent scoping adds project_users filter', async () => {
      mockPrisma.projects.findMany.mockResolvedValue([]);
      mockPrisma.projects.count.mockResolvedValue(0);
      await service.findAll(agentActor, {});
      expect(mockPrisma.projects.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project_users: { some: { user_id: agentActor.sub } },
          }),
        }),
      );
    });

    it('findAll — manager sees all projects (no user filter)', async () => {
      mockPrisma.projects.findMany.mockResolvedValue([]);
      mockPrisma.projects.count.mockResolvedValue(0);
      await service.findAll(managerActor, {});
      const call = mockPrisma.projects.findMany.mock.calls[0][0];
      expect(call.where.project_users).toBeUndefined();
    });

    it('findOne — agent with no membership gets ForbiddenException', async () => {
      mockPrisma.projects.findUnique.mockResolvedValue({
        id: 'p1',
        project_users: [],
        client: { id: 'c1', company_name: 'X' },
        name: 'P',
        objective: 'awareness',
        status: 'draft',
        start_date: null,
        end_date: null,
        budget_total: null,
        budget_currency: 'USD',
        meta_ads_account_id: null,
        created_by: 'u1',
        created_at: new Date(),
        updated_at: new Date(),
      });
      await expect(service.findOne('p1', agentActor as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should throw BadRequestException when project is not draft', async () => {
      mockPrisma.projects.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'active',
        name: 'P',
      });
      await expect(service.remove('p1', adminActor as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete draft project', async () => {
      mockPrisma.projects.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'draft',
        name: 'P',
      });
      mockPrisma.projects.delete.mockResolvedValue({});
      mockAudit.log.mockResolvedValue(undefined);
      const result = await service.remove('p1', adminActor);
      expect(result.message).toBe('Project deleted');
    });
  });

  describe('archive validation', () => {
    it('should prevent archiving project with active tasks', async () => {
      mockPrisma.projects.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'active',
        name: 'P',
      });
      mockPrisma.tasks.count.mockResolvedValue(3);
      await expect(
        service.update('p1', { status: 'archived' as any }, adminActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
