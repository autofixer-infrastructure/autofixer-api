import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ example: 'newemail@example.com' })
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'NewSecurePassword123!' })
  password?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  @ApiPropertyOptional({ example: 'Juan' })
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  @ApiPropertyOptional({ example: 'Pérez' })
  lastName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '+56912345678' })
  phone?: string;

  @IsEnum(UserRole)
  @IsOptional()
  @ApiPropertyOptional({ enum: UserRole })
  role?: UserRole;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'https://example.com/new-avatar.jpg' })
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: true })
  emailVerified?: boolean;
}
