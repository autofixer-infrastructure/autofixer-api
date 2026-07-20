import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { VehicleType } from '@prisma/client';

@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'vehicleType', required: false, enum: VehicleType })
  async findAll(
    @Query('category') category?: string,
    @Query('vehicleType') vehicleType?: VehicleType,
  ) {
    return this.servicesService.findAll({ category, vehicleType });
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular services' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPopular(@Query('limit') limit?: number) {
    return this.servicesService.getPopular(limit || 6);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured services' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFeatured(@Query('limit') limit?: number) {
    return this.servicesService.getFeatured(limit || 6);
  }

  @Get('symptoms')
  @ApiOperation({ summary: 'Get all symptoms for quote calculator' })
  async getSymptoms() {
    return this.servicesService.getSymptoms();
  }

  @Get('symptom/:symptom')
  @ApiOperation({ summary: 'Get services for a symptom' })
  async getServicesBySymptom(@Param('symptom') symptom: string) {
    return this.servicesService.getServicesBySymptom(symptom);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }
}
