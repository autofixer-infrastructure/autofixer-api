import { PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsDateString, IsUUID, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../enums/booking-status.enum';

export class UpdateBookingDto {
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional()
  vehicleId?: string;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional()
  addressId?: string;

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

  // Pricing
  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiPropertyOptional()
  laborCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiPropertyOptional()
  partsCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiPropertyOptional()
  materialsCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiPropertyOptional()
  travelCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiPropertyOptional()
  discount?: number;

  // Scheduling
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  scheduledTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @ApiPropertyOptional()
  estimatedDurationMinutes?: number;

  // Status
  @IsEnum(BookingStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: BookingStatus })
  status?: BookingStatus;

  // Notes
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  diagnosisNotes?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  workPerformed?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  recommendations?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  cancellationReason?: string;
}
