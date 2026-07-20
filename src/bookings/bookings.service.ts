/**
 * Bookings Service with Real-time Notifications
 * Handles booking lifecycle and triggers notifications on status changes
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { BookingStatus } from '@prisma/client';

export interface CreateBookingDto {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  vehicleId?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleLicensePlate?: string;
  address: string;
  commune: string;
  scheduledDate: Date;
  scheduledTimeSlot: string;
  symptoms?: string;
  notes?: string;
}

export interface UpdateBookingStatusDto {
  status: BookingStatus;
  notes?: string;
  reason?: string;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new booking
   */
  async create(dto: CreateBookingDto) {
    const booking = await this.prisma.booking.create({
      data: {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        address: dto.address,
        commune: dto.commune,
        scheduledDate: dto.scheduledDate,
        scheduledTimeSlot: dto.scheduledTimeSlot,
        vehicleBrand: dto.vehicleBrand,
        vehicleModel: dto.vehicleModel,
        vehicleYear: dto.vehicleYear,
        vehicleLicensePlate: dto.vehicleLicensePlate,
        symptoms: dto.symptoms,
        notes: dto.notes,
        status: BookingStatus.PENDING,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        vehicleId: dto.vehicleId,
      },
      include: {
        service: true,
        customer: true,
      },
    });

    this.logger.log(`Booking created: ${booking.id}`);

    // TODO: Send notification to admin (Slack/email) for manual assignment

    return booking;
  }

  /**
   * Get available time slots for a date and zone
   */
  async getAvailableSlots(date: Date, commune: string) {
    // Get zone for commune
    const communeData = await this.prisma.commune.findFirst({
      where: { name: commune },
      include: { zone: true },
    });

    if (!communeData) {
      throw new NotFoundException('Comuna no encontrada');
    }

    // Define time slots
    const allSlots = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '14:00', '15:00', '16:00', '17:00', '18:00'
    ];

    // Get bookings for this date
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        scheduledDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
        },
      },
      select: {
        scheduledTimeSlot: true,
        technicianId: true,
      },
    });

    // Group by time slot
    const bookedSlots = existingBookings.reduce((acc, b) => {
      if (!acc[b.scheduledTimeSlot]) {
        acc[b.scheduledTimeSlot] = [];
      }
      if (b.technicianId) {
        acc[b.scheduledTimeSlot].push(b.technicianId);
      }
      return acc;
    }, {} as Record<string, string[]>);

    // Get technicians with their zones
    const technicians = await this.prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      include: { technicianProfile: true },
    });

    // Build available slots with zone info
    const availableSlots = allSlots.map(slot => {
      const booked = bookedSlots[slot] || [];
      const availableTechnicians = technicians.filter(t => {
        // Check if technician is not booked in this slot
        const isBooked = booked.includes(t.id);
        // TODO: Check zone compatibility
        return !isBooked;
      });

      return {
        time: slot,
        available: availableTechnicians.length > 0,
        techniciansAvailable: availableTechnicians.length,
      };
    });

    return {
      date: date.toISOString().split('T')[0],
      zone: communeData.zone,
      travelFee: communeData.travelFee,
      slots: availableSlots,
    };
  }

  /**
   * Assign a technician to a booking
   */
  async assignTechnician(bookingId: string, technicianId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Solo se pueden asignar reservas pendientes');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        technicianId,
        status: BookingStatus.CONFIRMED,
      },
      include: {
        service: true,
        technician: true,
        customer: true,
      },
    });

    // Send confirmation notification
    if (updated.technician) {
      await this.notificationsService.notifyBookingConfirmed(
        updated,
        updated.technician
      );
    }

    this.logger.log(`Booking ${bookingId} assigned to technician ${technicianId}`);

    return updated;
  }

  /**
   * Update booking status with notification triggers
   * This is the main method that handles all status transitions
   */
  async updateStatus(
    bookingId: string,
    dto: UpdateBookingStatusDto,
    triggeredBy?: 'customer' | 'technician' | 'admin' | 'system'
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        technician: true,
        customer: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Validate status transition
    this.validateStatusTransition(booking.status, dto.status);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: dto.status,
        statusNotes: dto.notes,
        statusChangedAt: new Date(),
        statusChangedBy: triggeredBy,
      },
      include: {
        service: true,
        technician: true,
        customer: true,
      },
    });

    // Trigger notifications based on new status
    await this.triggerStatusNotifications(updated, dto);

    this.logger.log(`Booking ${bookingId} status changed: ${booking.status} -> ${dto.status}`);

    return updated;
  }

  /**
   * Technician starts traveling to customer location
   * This triggers the "en route" notification
   */
  async startTravel(bookingId: string, estimatedArrivalMinutes: number = 30) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.technicianId !== booking.technician?.id) {
      throw new BadRequestException('No tienes permiso para iniciar el viaje');
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('La reserva debe estar confirmada o en progreso');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        travelStartedAt: new Date(),
        estimatedArrival: new Date(Date.now() + estimatedArrivalMinutes * 60 * 1000),
      },
      include: {
        service: true,
        technician: true,
        customer: true,
      },
    });

    // Send "en route" notification with 30 min ETA
    await this.notificationsService.notifyTechnicianEnRoute(
      updated,
      estimatedArrivalMinutes
    );

    this.logger.log(`Technician started travel for booking ${bookingId}. ETA: ${estimatedArrivalMinutes} min`);

    return updated;
  }

  /**
   * Technician marks arrival at customer location
   */
  async markArrival(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, technician: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.IN_PROGRESS,
        arrivedAt: new Date(),
      },
      include: {
        service: true,
        technician: true,
        customer: true,
      },
    });

    // Send arrival notification
    await this.notificationsService.notifyTechnicianArrived(updated);

    this.logger.log(`Technician arrived for booking ${bookingId}`);

    return updated;
  }

  /**
   * Complete a booking
   */
  async completeBooking(
    bookingId: string,
    dto: {
      notes?: string;
      diagnosis?: string;
      workDone?: string;
      nextServiceDate?: Date;
    }
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, customer: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
        diagnosis: dto.diagnosis,
        workDone: dto.workDone,
        nextServiceDate: dto.nextServiceDate,
        statusNotes: dto.notes,
      },
      include: {
        service: true,
        technician: true,
        customer: true,
      },
    });

    // Send completion notification
    await this.notificationsService.notifyServiceCompleted(updated);

    // TODO: Create payment request if not prepaid

    this.logger.log(`Booking ${bookingId} completed`);

    return updated;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    reason: string,
    cancelledBy: 'customer' | 'technician' | 'admin'
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, customer: true },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy,
      },
    });

    // TODO: Send cancellation notification

    this.logger.log(`Booking ${bookingId} cancelled by ${cancelledBy}: ${reason}`);

    return updated;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(current: BookingStatus, next: BookingStatus) {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
      ],
      [BookingStatus.CONFIRMED]: [
        BookingStatus.IN_PROGRESS,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
      ],
      [BookingStatus.IN_PROGRESS]: [
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.COMPLETED]: [], // Terminal state
      [BookingStatus.CANCELLED]: [], // Terminal state
      [BookingStatus.NO_SHOW]: [
        BookingStatus.CANCELLED,
        BookingStatus.CONFIRMED, // Can rebook
      ],
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `No se puede cambiar de ${current} a ${next}`
      );
    }
  }

  /**
   * Trigger notifications based on status change
   */
  private async triggerStatusNotifications(booking: any, dto: UpdateBookingStatusDto) {
    switch (dto.status) {
      case BookingStatus.CONFIRMED:
        if (booking.technician) {
          await this.notificationsService.notifyBookingConfirmed(booking, booking.technician);
        }
        break;

      case BookingStatus.IN_PROGRESS:
        if (booking.technician && !booking.travelStartedAt) {
          // Technician is traveling
          await this.notificationsService.notifyTechnicianEnRoute(booking, 30);
        } else if (booking.arrivedAt) {
          // Technician arrived
          await this.notificationsService.notifyTechnicianArrived(booking);
        }
        break;

      case BookingStatus.COMPLETED:
        await this.notificationsService.notifyServiceCompleted(booking);
        break;

      case BookingStatus.CANCELLED:
        // Send cancellation notification
        break;
    }
  }

  /**
   * Get bookings for technician dashboard
   */
  async getTechnicianBookings(technicianId: string, date?: Date) {
    const where: any = {
      technicianId,
      status: {
        notIn: [BookingStatus.CANCELLED],
      },
    };

    if (date) {
      where.scheduledDate = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        service: true,
        customer: true,
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTimeSlot: 'asc' },
      ],
    });
  }

  /**
   * Get customer booking history
   */
  async getCustomerBookings(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: {
        service: true,
        technician: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  /**
   * Get booking by ID with all relations
   */
  async getById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        technician: true,
        customer: true,
        payments: true,
        quotes: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return booking;
  }
}
