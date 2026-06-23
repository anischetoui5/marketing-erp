import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { user_role, department } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ enum: user_role })
  @IsEnum(user_role)
  role: user_role;

  @ApiPropertyOptional({ enum: department })
  @IsEnum(department)
  @IsOptional()
  department?: department;
}
