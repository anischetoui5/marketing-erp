import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { user_role, department } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ enum: user_role })
  @IsEnum(user_role)
  @IsOptional()
  role?: user_role;

  @ApiPropertyOptional({ enum: department })
  @IsEnum(department)
  @IsOptional()
  department?: department;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
