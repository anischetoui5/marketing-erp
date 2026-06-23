import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, Req, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { CreateBudgetEntryDto } from './dto/create-budget-entry.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/auth.guard';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@ApiTags('Budget')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects/:projectId/budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post('entries')
  @ApiOperation({ summary: 'Add a budget entry' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateBudgetEntryDto,
    @Req() req: AuthRequest,
  ) {
    return this.budgetService.create({ ...dto, projectId }, req.user);
  }

  @Get('entries')
  @ApiOperation({ summary: 'List budget entries for a project' })
  findAll(@Param('projectId') projectId: string) {
    return this.budgetService.findForProject(projectId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get budget summary for a project' })
  summary(@Param('projectId') projectId: string) {
    return this.budgetService.getSummary(projectId);
  }

  @Delete('entries/:id')
  @ApiOperation({ summary: 'Delete a budget entry' })
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.budgetService.remove(id, req.user);
  }
}
