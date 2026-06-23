import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsIn,
  IsPositive,
} from 'class-validator';

export const BUDGET_CATEGORIES = [
  'ad_spend',
  'production',
  'design',
  'other',
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export class CreateBudgetEntryDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: BUDGET_CATEGORIES })
  @IsIn(BUDGET_CATEGORIES)
  category: BudgetCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-05-22' })
  @IsDateString()
  entryDate: string;
}
