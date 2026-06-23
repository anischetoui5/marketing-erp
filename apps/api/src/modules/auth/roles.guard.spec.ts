import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const createMockContext = (role: string): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createMockContext('marketing_agent'))).toBe(true);
  });

  it('allows access when role matches', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'marketing_manager']);
    expect(guard.canActivate(createMockContext('admin'))).toBe(true);
  });

  it('denies access when role does not match', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() =>
      guard.canActivate(createMockContext('marketing_agent')),
    ).toThrow(ForbiddenException);
  });
});
