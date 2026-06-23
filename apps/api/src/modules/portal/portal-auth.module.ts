import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalProjectsController } from './portal-projects.controller';
import { ClientJwtAuthGuard } from './portal-auth.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
    AuditLogModule,
    PrismaModule,
  ],
  providers: [PortalAuthService, ClientJwtAuthGuard],
  controllers: [PortalAuthController, PortalProjectsController],
  exports: [PortalAuthService, ClientJwtAuthGuard],
})
export class PortalAuthModule {}
