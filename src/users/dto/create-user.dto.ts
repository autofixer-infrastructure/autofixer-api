import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'SecurePassword123!' })
  password?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  @ApiProperty({ example: 'Juan' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  @ApiProperty({ example: 'Pérez' })
  lastName: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '+56912345678' })
  phone?: string;

  @IsEnum(UserRole)
  @IsOptional()
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.CLIENT })
  role?: UserRole;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;
}
