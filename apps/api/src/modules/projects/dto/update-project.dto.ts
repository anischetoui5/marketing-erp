import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProjectObjective } from './create-project.dto';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ProjectObjective })
  @IsOptional()
  @IsEnum(ProjectObjective)
  objective?: ProjectObjective;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budgetTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  budgetCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaAdsAccountId?: string;
}

export class UpdateProjectTeamDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  userIds: string[];
}
