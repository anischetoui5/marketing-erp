/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  projects: { findFirst: jest.fn() },
  tasks: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  task_assignees: { createMany: jest.fn(), deleteMany: jest.fn() },
};
const mockAudit = { log: jest.fn() };
const mockNotifications = { send: jest.fn() };

const adminActor = { sub: 'u1', email: 'admin@t.com', role: 'admin' };
const agentActor = { sub: 'u2', email: 'agent@t.com', role: 'marketing_agent' };
const managerActor = {
  sub: 'u3',
  email: 'mgr@t.com',
  role: 'marketing_manager',
};
const prodManagerActor = {
  sub: 'u4',
  email: 'pm@t.com',
  role: 'production_manager',
};

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    title: 'Task',
    description: null,
    department: 'marketing',
    status: 'todo',
    priority: 'medium',
    due_date: null,
    revision_count: 0,
    project_id: 'p1',
    created_by: 'u1',
    created_at: new Date(),
    updated_at: new Date(),
    task_assignees: [],
    ...overrides,
  };
}

describe('TasksService — status workflow', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  // ── Valid transitions ──
  it('agent can move todo → in_progress', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'todo', task_assignees: [{ user_id: 'u2' }] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockAudit.log.mockResolvedValue(undefined);
    mockNotifications.send.mockResolvedValue(undefined);
    const r = await service.updateStatus(
      't1',
      { status: 'in_progress' } as any,
      agentActor,
    );
    expect(r.status).toBe('in_progress');
  });

  it('agent can move in_progress → review', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'in_progress', task_assignees: [] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(makeTask({ status: 'review' }));
    mockAudit.log.mockResolvedValue(undefined);
    const r = await service.updateStatus(
      't1',
      { status: 'review' } as any,
      agentActor,
    );
    expect(r.status).toBe('review');
  });

  it('manager can move review → approved', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'review', task_assignees: [] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(makeTask({ status: 'approved' }));
    mockAudit.log.mockResolvedValue(undefined);
    const r = await service.updateStatus(
      't1',
      { status: 'approved' } as any,
      managerActor,
    );
    expect(r.status).toBe('approved');
  });

  it('manager can move review → revision and increments revision_count', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'review', revision_count: 1, task_assignees: [] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(
      makeTask({ status: 'revision', revision_count: 2 }),
    );
    mockAudit.log.mockResolvedValue(undefined);
    const r = await service.updateStatus(
      't1',
      { status: 'revision' } as any,
      managerActor,
    );
    expect(r.status).toBe('revision');
    expect(mockPrisma.tasks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revision_count: 2 }),
      }),
    );
  });

  it('manager can move approved → done', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'approved', task_assignees: [] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(makeTask({ status: 'done' }));
    mockAudit.log.mockResolvedValue(undefined);
    const r = await service.updateStatus(
      't1',
      { status: 'done' } as any,
      managerActor,
    );
    expect(r.status).toBe('done');
  });

  it('agent can move revision → review', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'revision', task_assignees: [] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(makeTask({ status: 'review' }));
    mockAudit.log.mockResolvedValue(undefined);
    await service.updateStatus('t1', { status: 'review' } as any, agentActor);
    expect(mockPrisma.tasks.update).toHaveBeenCalled();
  });

  // ── Invalid transitions ──
  it('throws BadRequestException for skipped step (todo → review)', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(makeTask({ status: 'todo' }));
    await expect(
      service.updateStatus(
        't1',
        { status: 'review' } as any,
        adminActor as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for backwards step (review → todo)', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'review' }),
    );
    await expect(
      service.updateStatus('t1', { status: 'todo' } as any, adminActor as any),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Role violations ──
  it('agent cannot move review → approved (gets ForbiddenException)', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'review' }),
    );
    await expect(
      service.updateStatus(
        't1',
        { status: 'approved' } as any,
        agentActor as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('manager cannot move todo → in_progress', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(makeTask({ status: 'todo' }));
    await expect(
      service.updateStatus(
        't1',
        { status: 'in_progress' } as any,
        managerActor as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('admin can move any valid transition', async () => {
    mockPrisma.tasks.findUnique.mockResolvedValue(
      makeTask({ status: 'todo', task_assignees: [] }),
    );
    mockPrisma.tasks.update.mockResolvedValue(
      makeTask({ status: 'in_progress' }),
    );
    mockAudit.log.mockResolvedValue(undefined);
    const r = await service.updateStatus(
      't1',
      { status: 'in_progress' } as any,
      adminActor,
    );
    expect(r.status).toBe('in_progress');
  });

  // ── Agent scoping ──
  it('agent only sees their assigned tasks', async () => {
    mockPrisma.tasks.findMany.mockResolvedValue([]);
    mockPrisma.tasks.count.mockResolvedValue(0);
    await service.findAll(agentActor, {});
    expect(mockPrisma.tasks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          task_assignees: { some: { user_id: agentActor.sub } },
        }),
      }),
    );
  });

  it('production_manager scoping check — no department filter by default', async () => {
    mockPrisma.tasks.findMany.mockResolvedValue([]);
    mockPrisma.tasks.count.mockResolvedValue(0);
    await service.findAll(prodManagerActor, {});
    const call = mockPrisma.tasks.findMany.mock.calls[0][0];
    expect(call.where.task_assignees).toBeUndefined();
  });
});
