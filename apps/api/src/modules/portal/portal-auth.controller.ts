import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { PortalAuthService } from './portal-auth.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { ClientJwtAuthGuard } from './portal-auth.guard';
import type { ClientJwtPayload } from './portal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('portal-auth')
@Controller('api/portal/auth')
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Client portal login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  async login(@Body() dto: PortalLoginDto, @Req() req: Request) {
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    const result = await this.portalAuthService.login(
      dto.email,
      dto.password,
      ipAddress,
    );
    return { data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh client portal access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.portalAuthService.refresh(dto.refreshToken);
    return { data: result };
  }

  @Post('logout')
  @UseGuards(ClientJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Client portal logout' })
  async logout(@CurrentUser() user: ClientJwtPayload, @Req() req: Request) {
    const ipAddress = req.ip ?? req.socket.remoteAddress;
    const result = await this.portalAuthService.logout(user.sub, ipAddress);
    return { data: result };
  }
}
