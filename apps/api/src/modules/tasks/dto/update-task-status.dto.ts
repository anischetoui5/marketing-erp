import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TaskStatusValue {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  REVISION = 'revision',
  APPROVED = 'approved',
  DONE = 'done',
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatusValue })
  @IsEnum(TaskStatusValue)
  status: TaskStatusValue;
}
