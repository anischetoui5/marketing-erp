import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    password_hash: '',
    full_name: 'Test User',
    role: 'admin' as const,
    department: 'marketing' as const,
    is_active: true,
    failed_login_attempts: 0,
    locked_until: null,
    invitation_token: null,
    invitation_expires_at: null,
    timezone: 'UTC',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockUser.password_hash = bcrypt.hashSync('TestPass123!', 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            users: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refresh_tokens: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_SECRET: 'secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    auditLogService = module.get(AuditLogService);
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.users.update as jest.Mock).mockResolvedValue(mockUser);
      await expect(
        service.login({ email: mockUser.email, password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for locked account', async () => {
      const lockedUser = { ...mockUser, locked_until: new Date(Date.now() + 60000) };
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(lockedUser);
      await expect(
        service.login({ email: mockUser.email, password: 'TestPass123!' }),
      ).rejects.toThrow('Account temporarily locked');
    });

    it('returns tokens and user on successful login', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.users.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refresh_tokens.create as jest.Mock).mockResolvedValue({});
      (auditLogService.log as jest.Mock).mockResolvedValue(undefined);

      const result = await service.login({ email: mockUser.email, password: 'TestPass123!' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
    });
  });

  describe('getMe', () => {
    it('returns user data without password_hash', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: mockUser.role,
        department: mockUser.department,
        timezone: mockUser.timezone,
        created_at: new Date(),
      });

      const result = await service.getMe(mockUser.id);
      expect(result).not.toHaveProperty('password_hash');
      expect(result.email).toBe(mockUser.email);
    });
  });
});
