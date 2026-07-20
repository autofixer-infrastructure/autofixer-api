import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, PaymentMethod } from '@prisma/client';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create payment for booking' })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 400, description: 'Invalid payment' })
  async createPayment(
    @Body() body: { bookingId: string; method: PaymentMethod },
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.createPayment(body.bookingId, body.method);
  }

  @Get(':paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment status' })
  async getPaymentStatus(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.paymentsService.getPaymentStatus(paymentId);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment by booking ID' })
  async getPaymentByBooking(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.paymentsService.getPaymentByBooking(bookingId);
  }

  // Flow callback (no auth - called by Flow)
  @Post('flow/callback')
  @ApiOperation({ summary: 'Flow payment callback (no auth)' })
  async handleFlowCallback(
    @Body() body: { token: string; [key: string]: any },
    @Req() req: Request,
  ) {
    // Merge query params and body
    const params = { ...req.query, ...body };
    return this.paymentsService.handleFlowCallback(params.token as string, params);
  }

  // WebPay return (no auth - called by WebPay)
  @Get('webpay/return')
  @ApiOperation({ summary: 'WebPay return URL (no auth)' })
  async handleWebPayReturn(
    @Query('token_ws') token: string,
    @Query('TBK_TOKEN') tbkToken: string,
  ) {
    if (tbkToken) {
      // User cancelled
      return { status: 'cancelled', message: 'Pago cancelado por el usuario' };
    }
    return this.paymentsService.handleWebPayReturn(token, tbkToken);
  }

  // WebPay finalize (no auth - called by WebPay)
  @Post('webpay/finalize')
  @ApiOperation({ summary: 'WebPay finalize (no auth)' })
  async handleWebPayFinalize(@Body() body: { token_ws: string }) {
    return this.paymentsService.handleWebPayReturn(body.token_ws, undefined);
  }

  @Post(':paymentId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Request refund (Admin only)' })
  async requestRefund(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentsService.requestRefund(paymentId, body.reason);
  }

  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payment statistics (Admin only)' })
  @ApiQuery({ name: 'fromDate', required: false, type: Date })
  @ApiQuery({ name: 'toDate', required: false, type: Date })
  async getPaymentStats(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.paymentsService.getPaymentStats({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }
}
