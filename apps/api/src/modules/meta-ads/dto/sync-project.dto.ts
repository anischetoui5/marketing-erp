import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncProjectDto {
  @ApiProperty()
  @IsUUID()
  projectId: string;
}
