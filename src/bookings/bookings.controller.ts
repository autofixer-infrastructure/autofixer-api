/**
 * Bookings Controller
 * Endpoints for booking management and technician actions
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { BookingStatus } from '@prisma/client';

@Controller('api/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Create a new booking (public)
   */
  @Post()
  async create(@Body() dto: any) {
    return this.bookingsService.create(dto);
  }

  /**
   * Get available time slots
   */
  @Get('slots')
  async getAvailableSlots(
    @Query('date') date: string,
    @Query('commune') commune: string,
  ) {
    return this.bookingsService.getAvailableSlots(
      new Date(date),
      commune,
    );
  }

  /**
   * Get single booking by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.bookingsService.getById(id);
  }

  /**
   * Get customer's bookings
   */
  @Get('customer/my')
  @UseGuards(JwtAuthGuard)
  async getMyBookings(@Request() req: any) {
    return this.bookingsService.getCustomerBookings(req.user.id);
  }

  /**
   * Get technician's bookings
   */
  @Get('technician/my')
  @UseGuards(JwtAuthGuard)
  @Roles('TECHNICIAN', 'ADMIN')
  async getMyTechnicianBookings(
    @Request() req: any,
    @Query('date') date?: string,
  ) {
    return this.bookingsService.getTechnicianBookings(
      req.user.id,
      date ? new Date(date) : undefined,
    );
  }

  /**
   * Technician: Accept a booking (assign self)
   */
  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @Roles('TECHNICIAN', 'ADMIN')
  async acceptBooking(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.bookingsService.assignTechnician(id, req.user.id);
  }

  /**
   * Technician: Start traveling to customer
   * This triggers the "en route" notification with 30 min ETA
   */
  @Post(':id/start-travel')
  @UseGuards(JwtAuthGuard)
  @Roles('TECHNICIAN', 'ADMIN')
  async startTravel(
    @Param('id') id: string,
    @Body() body: { estimatedMinutes?: number },
    @Request() req: any,
  ) {
    return this.bookingsService.startTravel(
      id,
      body.estimatedMinutes ?? 30,
    );
  }

  /**
   * Technician: Mark arrival at customer location
   * This triggers the "arrived" notification
   */
  @Post(':id/arrived')
  @UseGuards(JwtAuthGuard)
  @Roles('TECHNICIAN', 'ADMIN')
  async markArrival(@Param('id') id: string) {
    return this.bookingsService.markArrival(id);
  }

  /**
   * Technician: Complete the service
   */
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @Roles('TECHNICIAN', 'ADMIN')
  async complete(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.bookingsService.completeBooking(id, body);
  }

  /**
   * Cancel a booking
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ) {
    // Determine who is cancelling
    const user = req.user;
    let cancelledBy: 'customer' | 'technician' | 'admin' = 'customer';
    
    if (user.role === 'ADMIN') {
      cancelledBy = 'admin';
    } else if (user.role === 'TECHNICIAN') {
      cancelledBy = 'technician';
    }

    return this.bookingsService.cancelBooking(id, body.reason, cancelledBy);
  }

  /**
   * Admin: Update booking status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: BookingStatus; notes?: string },
  ) {
    return this.bookingsService.updateStatus(id, body, 'admin');
  }

  /**
   * Admin: Assign technician to booking
   */
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async assignTechnician(
    @Param('id') id: string,
    @Body() body: { technicianId: string },
  ) {
    return this.bookingsService.assignTechnician(id, body.technicianId);
  }

  /**
   * Admin: Get all bookings with filters
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async getAll(
    @Query('status') status?: BookingStatus,
    @Query('date') date?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    // TODO: Implement admin listing with filters
    return [];
  }
}
