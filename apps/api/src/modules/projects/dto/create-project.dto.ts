import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProjectObjective {
  AWARENESS = 'awareness',
  ENGAGEMENT = 'engagement',
  TRAFFIC = 'traffic',
  LEADS = 'leads',
  SALES = 'sales',
  CONVERSIONS = 'conversions',
}

export class CreateProjectDto {
  @ApiProperty({ description: 'Client UUID' })
  @IsUUID()
  clientId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ProjectObjective })
  @IsEnum(ProjectObjective)
  objective: ProjectObjective;

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

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  budgetCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaAdsAccountId?: string;
}
