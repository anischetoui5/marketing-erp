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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientUserDto } from './dto/create-client-user.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Create a client' })
  @ApiResponse({ status: 201, description: 'Client created' })
  async create(@Body() dto: CreateClientDto, @CurrentUser() user: JwtPayload) {
    const result = await this.clientsService.create(dto, user.sub, user.email);
    return { data: result };
  }

  @Get()
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({ summary: 'List clients (paginated)' })
  @ApiQuery({
    name: 'archived',
    required: false,
    type: Boolean,
    description: 'Filter archived clients (default false)',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('archived') archived?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const isArchived = archived === 'true';
    const result = await this.clientsService.findAll(
      page,
      limit,
      isArchived,
      search,
    );
    return { data: result };
  }

  @Get(':id')
  @Roles('admin', 'marketing_manager', 'marketing_agent')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findOne(@Param('id') id: string) {
    const result = await this.clientsService.findOne(id);
    return { data: result };
  }

  @Patch(':id')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Update client' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.clientsService.update(
      id,
      dto,
      user.sub,
      user.email,
    );
    return { data: result };
  }

  @Post(':clientId/users')
  @Roles('admin')
  @ApiOperation({ summary: 'Create client portal user (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Client user created and invitation queued',
  })
  async createClientUser(
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.clientsService.createClientUser(
      clientId,
      dto.email,
      dto.fullName,
      user.sub,
      user.email,
    );
    return { data: result };
  }

  @Get(':clientId/users')
  @Roles('admin')
  @ApiOperation({ summary: 'List client portal users (admin only)' })
  async findClientUsers(@Param('clientId') clientId: string) {
    const result = await this.clientsService.findClientUsers(clientId);
    return { data: result };
  }
}
