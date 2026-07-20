import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, ServiceType } from '@prisma/client';

export class CalculateQuoteDto {
  @IsEnum(VehicleType)
  @ApiPropertyOptional({ enum: VehicleType })
  vehicleType: VehicleType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  commune?: string;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String] })
  symptoms?: string[];

  @IsEnum(ServiceType)
  @IsOptional()
  @ApiPropertyOptional({ enum: ServiceType })
  refrigerantType?: ServiceType;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [String] })
  services?: { serviceType: ServiceType }[];
}
