/**
 * Notification Service
 * Handles SMS, WhatsApp, and Email notifications for booking events
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export enum NotificationType {
  BOOKING_CREATED = 'BOOKING_CREATED',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  TECHNICIAN_EN_ROUTE = 'TECHNICIAN_EN_ROUTE',
  TECHNICIAN_ARRIVED = 'TECHNICIAN_ARRIVED',
  SERVICE_STARTED = 'SERVICE_STARTED',
  SERVICE_COMPLETED = 'SERVICE_COMPLETED',
  SERVICE_CANCELLED = 'SERVICE_CANCELLED',
  REMINDER_30MIN = 'REMINDER_30MIN',
  REMINDER_1DAY = 'REMINDER_1DAY',
}

export interface NotificationPayload {
  type: NotificationType;
  customerPhone: string;
  customerName: string;
  technicianName?: string;
  technicianPhone?: string;
  bookingId: string;
  scheduledTime?: Date;
  estimatedArrival?: Date;
  serviceType?: string;
  notes?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  // Chilean phone validation
  private readonly PHONE_REGEX = /^(\+56|56|9)\d{8}$/;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Main notification dispatcher
   */
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Format phone number
      const phone = this.formatPhone(payload.customerPhone);
      
      if (!phone) {
        this.logger.warn(`Invalid phone number: ${payload.customerPhone}`);
        return false;
      }

      // Generate message based on type
      const message = this.generateMessage(payload);

      // Send via multiple channels (SMS + WhatsApp)
      const results = await Promise.allSettled([
        this.sendSMS(phone, message),
        this.sendWhatsApp(phone, message),
        this.sendEmail(payload, message),
      ]);

      const success = results.some(r => r.status === 'fulfilled');
      
      if (success) {
        this.logger.log(`Notification sent: ${payload.type} to ${phone}`);
      } else {
        this.logger.error(`Failed to send notification: ${payload.type}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Send booking confirmation notification
   */
  async notifyBookingConfirmed(
    booking: any,
    technician: any
  ): Promise<boolean> {
    return this.sendNotification({
      type: NotificationType.BOOKING_CONFIRMED,
      customerPhone: booking.customerPhone,
      customerName: booking.customerName,
      technicianName: technician.name,
      technicianPhone: technician.phone,
      bookingId: booking.id,
      scheduledTime: booking.scheduledDate,
      serviceType: booking.service?.name,
    });
  }

  /**
   * Send "technician is on the way" notification
   * Called when technician starts traveling to customer location
   */
  async notifyTechnicianEnRoute(
    booking: any,
    estimatedArrivalMinutes: number = 30
  ): Promise<boolean> {
    const estimatedArrival = new Date();
    estimatedArrival.setMinutes(estimatedArrival.getMinutes() + estimatedArrivalMinutes);

    return this.sendNotification({
      type: NotificationType.TECHNICIAN_EN_ROUTE,
      customerPhone: booking.customerPhone,
      customerName: booking.customerName,
      technicianName: booking.technician?.name,
      bookingId: booking.id,
      estimatedArrival,
      serviceType: booking.service?.name,
    });
  }

  /**
   * Send "technician arrived" notification
   */
  async notifyTechnicianArrived(
    booking: any
  ): Promise<boolean> {
    return this.sendNotification({
      type: NotificationType.TECHNICIAN_ARRIVED,
      customerPhone: booking.customerPhone,
      customerName: booking.customerName,
      technicianName: booking.technician?.name,
      bookingId: booking.id,
      serviceType: booking.service?.name,
    });
  }

  /**
   * Send service completed notification
   */
  async notifyServiceCompleted(booking: any): Promise<boolean> {
    return this.sendNotification({
      type: NotificationType.SERVICE_COMPLETED,
      customerPhone: booking.customerPhone,
      customerName: booking.customerName,
      bookingId: booking.id,
      serviceType: booking.service?.name,
    });
  }

  /**
   * Send reminder 30 minutes before appointment
   */
  async send30MinuteReminder(booking: any): Promise<boolean> {
    return this.sendNotification({
      type: NotificationType.REMINDER_30MIN,
      customerPhone: booking.customerPhone,
      customerName: booking.customerName,
      technicianName: booking.technician?.name,
      technicianPhone: booking.technician?.phone,
      bookingId: booking.id,
      scheduledTime: booking.scheduledDate,
      serviceType: booking.service?.name,
    });
  }

  /**
   * Format Chilean phone number
   */
  private formatPhone(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('56') && digits.length === 11) {
      // 56XXXXXXXXX - already formatted
      return '+' + digits;
    } else if (digits.startsWith('9') && digits.length === 9) {
      // 9XXXXXXXX - add +56
      return '+56' + digits;
    } else if (digits.length === 8 && !digits.startsWith('9')) {
      // Landline - add +56
      return '+56' + digits;
    }
    
    return '+' + digits;
  }

  /**
   * Generate message based on notification type
   */
  private generateMessage(payload: NotificationPayload): string {
    const timeFormat = { hour: '2-digit', minute: '2-digit' };

    switch (payload.type) {
      case NotificationType.BOOKING_CONFIRMED:
        return `🎉 ¡Hola ${payload.customerName}! Tu servicio de ${payload.serviceType} fue confirmado. ` +
          `${payload.technicianName} llegará a las ${payload.scheduledTime?.toLocaleTimeString('es-CL', timeFormat)}. ` +
          `Te avisaremos cuando esté en camino. - Autofixer`;

      case NotificationType.TECHNICIAN_EN_ROUTE:
        return `🚗 ¡Hola ${payload.customerName}! ${payload.technicianName} ya va en camino. ` +
          `Llegamos en aproximadamente 30 minutos. ` +
          `Prepárate con tu vehículo. - Autofixer`;

      case NotificationType.TECHNICIAN_ARRIVED:
        return `🏠 ¡Hola ${payload.customerName}! ${payload.technicianName} llegó y está esperando. ` +
          `El servicio de ${payload.serviceType} está por comenzar. - Autofixer`;

      case NotificationType.SERVICE_COMPLETED:
        return `✅ ¡Listo ${payload.customerName}! Tu servicio de ${payload.serviceType} fue completado. ` +
          `Recuerda que tienes garantía de 90 días. Gracias por confiar en Autofixer.`;

      case NotificationType.REMINDER_30MIN:
        return `⏰ ¡Hola ${payload.customerName}! Tu servicio de ${payload.serviceType} es en 30 minutos. ` +
          `${payload.technicianName} llegará a las ${payload.scheduledTime?.toLocaleTimeString('es-CL', timeFormat)}. ` +
          `¿Tienes alguna duda? Llama al ${payload.technicianPhone}. - Autofixer`;

      case NotificationType.SERVICE_CANCELLED:
        return `❌ Lo sentimos ${payload.customerName}, tu servicio de ${payload.serviceType} fue cancelado. ` +
          `Contáctanos para reagendar sin costo. - Autofixer`;

      default:
        return `Autofixer: Notificación para ${payload.customerName}`;
    }
  }

  /**
   * Send SMS via provider (configurable)
   * Currently stub - integrate with Twilio, Vonage, or local Chilean provider
   */
  private async sendSMS(phone: string, message: string): Promise<boolean> {
    const smsProvider = this.configService.get('SMS_PROVIDER', 'twilio');
    
    // Twilio integration example:
    if (smsProvider === 'twilio') {
      // const client = require('twilio')(
      //   this.configService.get('TWILIO_ACCOUNT_SID'),
      //   this.configService.get('TWILIO_AUTH_TOKEN')
      // );
      // await client.messages.create({
      //   body: message,
      //   from: this.configService.get('TWILIO_PHONE_NUMBER'),
      //   to: phone,
      // });
    }
    
    // For now, log the SMS
    this.logger.log(`[SMS] To: ${phone} | Message: ${message}`);
    return true;
  }

  /**
   * Send WhatsApp message via Twilio or WhatsApp Business API
   */
  private async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    const whatsappProvider = this.configService.get('WHATSAPP_PROVIDER', 'twilio');
    
    if (whatsappProvider === 'twilio') {
      // const client = require('twilio')(
      //   this.configService.get('TWILIO_ACCOUNT_SID'),
      //   this.configService.get('TWILIO_AUTH_TOKEN')
      // );
      // await client.messages.create({
      //   body: message,
      //   from: 'whatsapp:' + this.configService.get('TWILIO_WHATSAPP_NUMBER'),
      //   to: 'whatsapp:' + phone,
      // });
    }
    
    this.logger.log(`[WhatsApp] To: ${phone} | Message: ${message}`);
    return true;
  }

  /**
   * Send email notification
   */
  private async sendEmail(payload: NotificationPayload, message: string): Promise<boolean> {
    // const emailProvider = this.configService.get('EMAIL_PROVIDER', 'resend');
    
    // Example with Resend:
    // const resend = new Resend(this.configService.get('RESEND_API_KEY'));
    // await resend.emails.send({
    //   from: 'Autofixer <notificaciones@autofixer.cl>',
    //   to: customerEmail,
    //   subject: this.getEmailSubject(payload.type),
    //   html: this.getEmailHtml(payload, message),
    // });
    
    this.logger.log(`[Email] To: ${payload.customerName} | Type: ${payload.type}`);
    return true;
  }

  private getEmailSubject(type: NotificationType): string {
    const subjects: Record<string, string> = {
      [NotificationType.BOOKING_CREATED]: '📋 Tu solicitud fue recibida - Autofixer',
      [NotificationType.BOOKING_CONFIRMED]: '✅ Tu servicio fue confirmado - Autofixer',
      [NotificationType.TECHNICIAN_EN_ROUTE]: '🚗 Tu técnico va en camino - Autofixer',
      [NotificationType.TECHNICIAN_ARRIVED]: '🏠 Tu técnico llegó - Autofixer',
      [NotificationType.SERVICE_STARTED]: '🔧 Tu servicio ha iniciado - Autofixer',
      [NotificationType.SERVICE_COMPLETED]: '✅ Servicio completado - Autofixer',
      [NotificationType.REMINDER_30MIN]: '⏰ Recordatorio: Tu servicio es en 30 min - Autofixer',
      [NotificationType.REMINDER_1DAY]: '📅 Recordatorio: Tu servicio es mañana - Autofixer',
      [NotificationType.SERVICE_CANCELLED]: '❌ Servicio cancelado - Autofixer',
    };
    return subjects[type] || 'Notificación Autofixer';
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean },
  ) {
    const { page, limit, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        unreadCount,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta notificación');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta notificación');
    }

    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(
    userId: string,
    data: {
      type?: NotificationType;
      title?: string;
      message?: string;
      data?: Record<string, any>;
      channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'ALL';
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const payload: NotificationPayload = {
      type: data.type || NotificationType.BOOKING_CONFIRMED,
      customerPhone: user.phone || '',
      customerName: user.name,
      bookingId: data.data?.bookingId || '',
      notes: data.message,
    };

    const success = await this.sendNotification(payload);

    // Store in DB
    await this.prisma.notification.create({
      data: {
        userId,
        type: data.type || NotificationType.BOOKING_CONFIRMED,
        title: data.title || 'Notificación',
        message: data.message || '',
        data: data.data || {},
        isRead: false,
      },
    });

    return { success };
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulk(
    userIds: string[],
    data: {
      type?: NotificationType;
      title?: string;
      message?: string;
      data?: Record<string, any>;
      channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'ALL';
    },
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, data)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { succeeded, failed, total: userIds.length };
  }

  private getEmailHtml(payload: NotificationPayload, message: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A5F; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Autofixer</h1>
          <p style="color: #F59E0B; margin: 5px 0 0;">Aire Acondicionado a Domicilio</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 18px; line-height: 1.6;">${message}</p>
          <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              ¿Preguntas? Contáctanos al <strong>+56 9 0000 0000</strong><br>
              o visita <a href="https://autofixer.cl" style="color: #1E3A5F;">autofixer.cl</a>
            </p>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
          © 2025 Autofixer. Todos los derechos reservados.
        </div>
      </div>
    `;
  }
}
