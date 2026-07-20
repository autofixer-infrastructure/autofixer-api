import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Public DTO for quote calculation (no auth required)
 * Accepts string values that get converted to enums in the service
 */
export class PublicCalculateQuoteDto {
  @IsString()
  @ApiPropertyOptional({ description: 'Vehicle type (SEDAN, SUV, etc)' })
  vehicleType: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Commune name for travel fee calculation' })
  commune?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String], description: 'Symptoms detected (diagnostic, carga-r134a, sanitizacion, etc)' })
  symptoms?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Refrigerant type (R134A_REFILL, R1234YF_REFILL)' })
  refrigerantType?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Specific services to include' })
  services?: { serviceType: string }[];
}
