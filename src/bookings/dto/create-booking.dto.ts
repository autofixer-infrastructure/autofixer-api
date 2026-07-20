import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsUUID, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, ServiceType } from '@prisma/client';

class BookingServiceDto {
  @IsUUID()
  @ApiProperty()
  serviceId: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @ApiPropertyOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  unitPrice: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  totalPrice: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  notes?: string;
}

export class CreateBookingDto {
  @IsUUID()
  @ApiProperty({ description: 'Vehicle ID' })
  vehicleId: string;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Address ID (optional if providing address details)' })
  addressId?: string;

  // Address details (if not using addressId)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  street?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  number?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  department?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  commune?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  reference?: string;

  // Quote reference
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional()
  quoteId?: string;

  // Pricing
  @IsNumber()
  @Min(0)
  @ApiProperty()
  laborCost: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  partsCost: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  materialsCost: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  travelCost: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  discount?: number;

  // Scheduling
  @IsDateString()
  @ApiProperty({ description: 'Scheduled date (ISO 8601)' })
  scheduledDate: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '10:00' })
  scheduledTime: string;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  estimatedDurationMinutes?: number;

  // Services
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceDto)
  @IsOptional()
  @ApiPropertyOptional({ type: [BookingServiceDto] })
  services?: BookingServiceDto[];
}
