import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Public DTO for creating quotes from the website (no auth required)
 */
export class PublicCreateQuoteDto {
  @IsEmail()
  @ApiProperty({ description: 'Client email' })
  clientEmail: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Client phone' })
  clientPhone?: string;

  @IsString()
  @ApiProperty({ description: 'Commune name' })
  commune: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Full address' })
  address?: string;

  @IsString()
  @ApiProperty({ description: 'Vehicle type (SEDAN, SUV, etc)' })
  vehicleType: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Vehicle brand' })
  vehicleBrand?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Vehicle model' })
  vehicleModel?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Refrigerant type' })
  refrigerantType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String], description: 'Symptoms detected' })
  symptoms?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Additional description' })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  utmCampaign?: string;
}
