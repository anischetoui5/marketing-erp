import { IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2025-01-31' })
  @IsDateString()
  periodEnd: string;
}
