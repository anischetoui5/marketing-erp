import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, ValidateIf } from 'class-validator';

export class ReviewTaskDto {
  @ApiProperty({ enum: ['client_approved', 'client_rejected'] })
  @IsIn(['client_approved', 'client_rejected'])
  decision: 'client_approved' | 'client_rejected';

  @ApiPropertyOptional()
  @ValidateIf((o: ReviewTaskDto) => o.decision === 'client_rejected')
  @IsString({
    message: 'A rejection comment is required when rejecting a task',
  })
  comment?: string;
}
