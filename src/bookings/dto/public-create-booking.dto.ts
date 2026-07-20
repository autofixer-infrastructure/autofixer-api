import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, Min, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Public DTO for booking creation from cotizador (no auth required)
 */
class BookingServiceDto {
  @IsString()
  @ApiProperty({ description: 'Service ID or type' })
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

export class PublicCreateBookingDto {
  // Client info (for creating/finding guest user)
  @IsEmail()
  @ApiProperty({ description: 'Client email (required for public bookings)' })
  clientEmail: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Client name' })
  clientName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Client phone' })
  clientPhone?: string;

  // Vehicle ID (optional - can create new vehicle)
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Vehicle ID (optional for public bookings)' })
  vehicleId?: string;

  // Vehicle details (if no vehicleId)
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
  @ApiPropertyOptional({ description: 'Vehicle type' })
  vehicleType?: string;

  // Address
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Street address' })
  street?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Street number' })
  number?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Department/Unit' })
  department?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Commune' })
  commune: string;

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
  @ApiPropertyOptional({ description: 'Reference/Instructions' })
  reference?: string;

  // Quote reference
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Quote ID' })
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
