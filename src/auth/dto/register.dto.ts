import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @ApiProperty({
    description: 'User password (min 8 chars, must include uppercase, lowercase, number, special char)',
    example: 'SecurePassword123!',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  @ApiProperty({
    description: 'User first name',
    example: 'Juan',
  })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  @ApiProperty({
    description: 'User last name',
    example: 'Pérez',
  })
  lastName: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+56[0-9]{9}$/, {
    message: 'Phone must be a valid Chilean phone number (e.g., +56912345678)',
  })
  @ApiPropertyOptional({
    description: 'User phone number (Chilean format)',
    example: '+56912345678',
  })
  phone?: string;

  @IsEnum(['CLIENT', 'TECHNICIAN', 'ADMIN'])
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User role (defaults to CLIENT)',
    enum: ['CLIENT', 'TECHNICIAN', 'ADMIN'],
    default: 'CLIENT',
  })
  role?: string;
}
