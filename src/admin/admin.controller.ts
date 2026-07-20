import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('technicians/report')
  @ApiOperation({ summary: 'Get technician performance report' })
  @ApiQuery({ name: 'technicianId', required: false, type: String })
  async getTechnicianReport(@Query('technicianId') technicianId?: string) {
    return this.adminService.getTechnicianReport(technicianId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  async getRevenueReport(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.adminService.getRevenueReport({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      groupBy,
    });
  }

  // Zone management
  @Get('zones')
  @ApiOperation({ summary: 'Get all zones' })
  async getZones() {
    return this.adminService.getZones();
  }

  @Post('zones')
  @ApiOperation({ summary: 'Create a new zone' })
  async createZone(
    @Body() body: { name: string; displayName: string; color?: string },
  ) {
    return this.adminService.createZone(body);
  }

  @Put('zones/:id')
  @ApiOperation({ summary: 'Update zone' })
  async updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { displayName?: string; color?: string; isActive?: boolean },
  ) {
    return this.adminService.updateZone(id, body);
  }

  // Technician-Zone assignment
  @Post('zones/:zoneId/technicians/:technicianId')
  @ApiOperation({ summary: 'Assign technician to zone' })
  async assignTechnicianToZone(
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('technicianId', ParseUUIDPipe) technicianId: string,
    @Body() body: { isPrimary?: boolean },
  ) {
    return this.adminService.assignTechnicianToZone(technicianId, zoneId, body.isPrimary);
  }

  @Delete('zones/:zoneId/technicians/:technicianId')
  @ApiOperation({ summary: 'Remove technician from zone' })
  async removeTechnicianFromZone(
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Param('technicianId', ParseUUIDPipe) technicianId: string,
  ) {
    return this.adminService.removeTechnicianFromZone(technicianId, zoneId);
  }

  // Commune management
  @Get('communes')
  @ApiOperation({ summary: 'Get all communes' })
  async getCommunes() {
    return this.adminService.getCommunes();
  }

  @Post('communes')
  @ApiOperation({ summary: 'Create a new commune' })
  async createCommune(
    @Body() body: { name: string; region: string; zoneId?: string; basePrice?: number; travelFee?: number },
  ) {
    return this.adminService.createCommune(body);
  }

  // System
  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all data for backup' })
  async exportData() {
    return this.adminService.exportData();
  }
}
