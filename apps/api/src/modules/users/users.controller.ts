import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'production_manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user and send invitation (admin: any role | managers: own agent type only)' })
  @ApiResponse({ status: 201, description: 'User created and invitation queued' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    const result = await this.usersService.create(dto, user.sub, user.email, user.role);
    return { data: result };
  }

  @Post('accept-invitation')
  @ApiOperation({ summary: 'Accept invitation and activate account' })
  @ApiResponse({ status: 200, description: 'Account activated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    const result = await this.usersService.acceptInvitation(dto);
    return { data: result };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing_manager', 'production_manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (admin: all | managers: their agent type only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.usersService.findAll(page, limit, user.role);
    return { data: result };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const result = await this.usersService.findOne(id);
    return { data: result };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiResponse({ status: 403, description: 'Cannot deactivate yourself' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.usersService.update(id, dto, user.sub, user.email);
    return { data: result };
  }
}
