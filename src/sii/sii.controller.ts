import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SiiService } from './sii.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('SII')
@Controller({ path: 'sii', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SiiController {
  constructor(private readonly siiService: SiiService) {}

  @Post('boleta/:bookingId')
  @ApiOperation({ summary: 'Generate electronic receipt (boleta) for booking' })
  @ApiResponse({ status: 201, description: 'Boleta generated' })
  async generateBoleta(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() body: { rut?: string },
    @CurrentUser() user: any,
  ) {
    return this.siiService.generateBoleta(bookingId, body.rut);
  }

  @Post('factura/:bookingId')
  @ApiOperation({ summary: 'Generate electronic invoice (factura) for booking' })
  @ApiResponse({ status: 201, description: 'Factura generated' })
  async generateFactura(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body()
    body: {
      rut: string;
      razonSocial: string;
      giro?: string;
      direccion?: string;
      comuna?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.siiService.generateFactura(bookingId, body);
  }

  @Post('void/:documentNumber')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Void a document and generate credit note (Admin only)' })
  @ApiResponse({ status: 200, description: 'Document voided' })
  async voidDocument(
    @Param('documentNumber') documentNumber: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    return this.siiService.voidDocument(documentNumber, body.reason);
  }

  @Get('status/:documentNumber')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get SII document status' })
  async getDocumentStatus(@Param('documentNumber') documentNumber: string) {
    return this.siiService.getDocumentStatus(documentNumber);
  }

  @Get('report/daily')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get daily sales report for SII' })
  @ApiResponse({ status: 200, description: 'Daily report' })
  async getDailyReport(@Query('date') date?: string) {
    const reportDate = date ? new Date(date) : new Date();
    return this.siiService.getDailySalesReport(reportDate);
  }
}
