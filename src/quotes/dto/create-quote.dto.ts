import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, IsEnum, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, ServiceType } from '@prisma/client';

export class CalculateQuoteDto {
  @IsEnum(VehicleType)
  @ApiProperty({ enum: VehicleType, description: 'Vehicle type' })
  vehicleType: VehicleType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Commune name' })
  commune?: string;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Symptom keywords',
    example: ['no_cooling', 'bad_smell'],
  })
  symptoms?: string[];

  @IsEnum(ServiceType)
  @IsOptional()
  @ApiPropertyOptional({
    enum: ServiceType,
    description: 'Refrigerant type (if requesting refill)',
  })
  refrigerantType?: ServiceType;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Direct service requests',
    type: [String],
  })
  services?: { serviceType: ServiceType }[];
}

export class CreateQuoteDto {
  // Client info
  clientId?: string;

  @IsEmail()
  @ApiProperty({ example: 'client@example.com' })
  clientEmail: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '+56912345678' })
  clientPhone?: string;

  // Location
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Commune' })
  commune?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Full address' })
  address?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  lng?: number;

  // Vehicle
  @IsEnum(VehicleType)
  @ApiProperty({ enum: VehicleType })
  vehicleType: VehicleType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Toyota' })
  vehicleBrand?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Corolla' })
  vehicleModel?: string;

  @IsEnum(ServiceType)
  @IsOptional()
  @ApiPropertyOptional({ enum: ServiceType })
  refrigerantType?: ServiceType;

  // Symptoms and description
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String] })
  symptoms?: string[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Additional description' })
  description?: string;

  // UTM tracking
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
