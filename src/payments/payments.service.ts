import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';

interface FlowPaymentResponse {
  token: string;
  url: string;
  flowOrderId: number;
}

interface WebPayPaymentResponse {
  token: string;
  url: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly flowApiUrl: string;
  private readonly flowCommerceCode: string;
  private readonly flowApiKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.flowApiUrl = this.configService.get<string>('FLOW_API_URL', 'https://www.flow.cl/api');
    this.flowCommerceCode = this.configService.get<string>('FLOW_COMMERCE_CODE', '');
    this.flowApiKey = this.configService.get<string>('FLOW_API_KEY', '');
  }

  /**
   * Create payment intent and get payment URL
   */
  async createPayment(bookingId: string, method: PaymentMethod) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.total <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Booking already paid');
    }

    // Create or update payment record
    let payment = existingPayment;
    
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount: booking.total,
          method,
          status: PaymentStatus.PENDING,
        },
      });
    } else {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { method, status: PaymentStatus.PENDING },
      });
    }

    // Generate payment URL based on method
    let paymentUrl: string;
    let paymentToken: string;

    switch (method) {
      case PaymentMethod.FLOW:
        const flowResponse = await this.createFlowPayment(payment, booking);
        paymentUrl = flowResponse.url;
        paymentToken = flowResponse.token;
        break;
        
      case PaymentMethod.WEBPAY:
        const webpayResponse = await this.createWebPayPayment(payment, booking);
        paymentUrl = webpayResponse.url;
        paymentToken = webpayResponse.token;
        break;
        
      case PaymentMethod.TRANSFER:
        // For transfer, return manual payment instructions
        paymentUrl = await this.getTransferInstructions(payment);
        paymentToken = payment.id;
        break;
        
      case PaymentMethod.CASH:
        // Cash payments are handled offline
        return {
          paymentId: payment.id,
          method,
          amount: booking.total,
          status: PaymentStatus.PENDING,
          instructions: 'Pago en efectivo al técnico al finalizar el servicio.',
        };

      default:
        throw new BadRequestException('Invalid payment method');
    }

    // Update payment with token
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        flowToken: method === PaymentMethod.FLOW ? paymentToken : undefined,
        webpayToken: method === PaymentMethod.WEBPAY ? paymentToken : undefined,
        paymentUrl,
      },
    });

    return {
      paymentId: payment.id,
      method,
      amount: booking.total,
      url: paymentUrl,
      status: PaymentStatus.PENDING,
    };
  }

  /**
   * Flow.cl payment creation
   */
  private async createFlowPayment(payment: any, booking: any): Promise<FlowPaymentResponse> {
    // TODO: Implement actual Flow.cl API integration
    // This is a placeholder implementation
    
    const returnUrl = this.configService.get<string>('FLOW_RETURN_URL');
    const confirmationUrl = this.configService.get<string>('FLOW_CONFIRMATION_URL');
    
    const params = {
      commerceCode: this.flowCommerceCode,
      subject: `Reserva ${booking.bookingNumber}`,
      amount: Number(booking.total),
      email: booking.client.email,
      optional: JSON.stringify({ bookingId: booking.id }),
      callback: confirmationUrl,
      returnUrl,
    };

    // Generate mock response (replace with actual Flow API call)
    const token = crypto.randomBytes(32).toString('hex');
    const flowOrderId = Date.now();

    this.logger.log(`[FLOW] Creating payment: ${JSON.stringify(params)}`);

    // Mock URL - in production, this would come from Flow API
    const url = `https://www.flow.cl/api/pay/${token}`;

    return { token, url, flowOrderId };
  }

  /**
   * WebPay (Transbank) payment creation
   */
  private async createWebPayPayment(payment: any, booking: any): Promise<WebPayPaymentResponse> {
    // TODO: Implement actual WebPay API integration
    // This is a placeholder implementation
    
    const returnUrl = this.configService.get<string>('WEBPAY_RETURN_URL');
    
    const params = {
      buyOrder: `BO-${booking.id.slice(0, 8)}`,
      sessionId: booking.clientId,
      amount: Number(booking.total),
      returnUrl,
    };

    // Generate mock response (replace with actual WebPay API call)
    const token = crypto.randomBytes(32).toString('hex');

    this.logger.log(`[WEBPAY] Creating payment: ${JSON.stringify(params)}`);

    // Mock URL - in production, this would come from WebPay API
    const url = `https://www.transbank.cl/webpay/transbank.php?token=${token}`;

    return { token, url };
  }

  /**
   * Get transfer payment instructions
   */
  private async getTransferInstructions(payment: any): Promise<string> {
    return `
    Instrucciones de pago por transferencia:
    
    Banco: Banco de Chile
    Tipo de Cuenta: Cuenta Corriente
    Número: 12345678
    RUT: 12.345.678-9
    Nombre: Autofixer SpA
    Email: pagos@autofixer.cl
    
    Por favor indicar el número de reserva en el comentario de la transferencia.
    
    Su pago será confirmado dentro de 24 horas hábiles.
    `.trim();
  }

  /**
   * Handle Flow payment callback (confirmation)
   */
  async handleFlowCallback(token: string, params: any) {
    this.logger.log(`[FLOW] Callback received: token=${token}`);

    const payment = await this.prisma.payment.findFirst({
      where: { flowToken: token },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // TODO: Verify with Flow API that payment was successful
    // In production, you would call Flow's /payment/getStatus endpoint
    
    if (params.status === '2') {
      // Payment successful (Flow status codes vary)
      return this.confirmPayment(payment.id);
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });

    return { status: 'failed', paymentId: payment.id };
  }

  /**
   * Handle WebPay payment return
   */
  async handleWebPayReturn(token: string, tbkToken: string) {
    this.logger.log(`[WEBPAY] Return received: token=${token}`);

    const payment = await this.prisma.payment.findFirst({
      where: { webpayToken: token },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // TODO: Verify with WebPay API that payment was successful
    // In production, you would call WebPay's /transbank/commit endpoint

    return this.confirmPayment(payment.id);
  }

  /**
   * Confirm payment and update booking
   */
  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        flowTransferDate: new Date(),
      },
      include: { booking: true },
    });

    // Update booking payment status
    await this.prisma.booking.update({
      where: { id: payment.bookingId },
      data: { payment: { connect: { id: paymentId } } },
    });

    this.logger.log(`[PAYMENT] Confirmed: ${paymentId}, Amount: ${payment.amount}`);

    return {
      paymentId: payment.id,
      status: PaymentStatus.PAID,
      amount: payment.amount,
      bookingId: payment.bookingId,
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            client: { select: { email: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get payments by booking
   */
  async getPaymentByBooking(bookingId: string) {
    return this.prisma.payment.findUnique({
      where: { bookingId },
    });
  }

  /**
   * Request refund
   */
  async requestRefund(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Can only refund paid payments');
    }

    // TODO: Process refund with Flow/WebPay
    // For now, just mark as refunded
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: reason,
      },
    });
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(params: { fromDate?: Date; toDate?: Date }) {
    const { fromDate, toDate } = params;

    const where: any = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [totalPayments, byStatus, byMethod, totalRefunded] = await Promise.all([
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { ...where, status: PaymentStatus.PAID },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.REFUNDED },
        _sum: { refundAmount: true },
      }),
    ]);

    return {
      total: {
        amount: totalPayments._sum.amount || 0,
        count: totalPayments._count || 0,
      },
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = { count: item._count, amount: item._sum?.amount || 0 };
        return acc;
      }, {} as Record<string, any>),
      byMethod: byMethod.reduce((acc, item) => {
        acc[item.method] = { count: item._count, amount: item._sum?.amount || 0 };
        return acc;
      }, {} as Record<string, any>),
      totalRefunded: totalRefunded._sum.refundAmount || 0,
    };
  }
}
