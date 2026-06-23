import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
