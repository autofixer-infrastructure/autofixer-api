import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType } from '@prisma/client';

interface SiiDocument {
  type: DocumentType;
  folio: number;
  rut: string;
  dv: string;
 razonSocial: string;
  fecha: Date;
  glosa: string;
  neto: number;
  iva: number;
  total: number;
  detalle: SiiDetailItem[];
}

interface SiiDetailItem {
  nroLinea: number;
  tipoDoc: string;
  nmbItem: string;
  qtyItem: number;
  prcItem: number;
  montoItem: number;
}

@Injectable()
export class SiiService {
  private readonly logger = new Logger(SiiService.name);
  private readonly siiEnv: string;
  private readonly siiRut: string;
  private readonly siiDv: string;
  private readonly siiUsername: string;
  private readonly siiPassword: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.siiEnv = this.configService.get<string>('SII_ENV', 'certification');
    this.siiRut = this.configService.get<string>('SII_RUT', '');
    this.siiDv = this.configService.get<string>('SII_DV', '');
    this.siiUsername = this.configService.get<string>('SII_USERNAME', '');
    this.siiPassword = this.configService.get<string>('SII_PASSWORD', '');
  }

  /**
   * Generate boleta electrónica for a booking
   */
  async generateBoleta(bookingId: string, rut?: string): Promise<{
    success: boolean;
    documentNumber: string;
    folio: number;
    url?: string;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        services: {
          include: { service: true },
        },
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Build document detail
    const detalle: SiiDetailItem[] = booking.services.map((bs, index) => ({
      nroLinea: index + 1,
      tipoDoc: 'BOLETA',
      nmbItem: bs.service.displayName,
      qtyItem: bs.quantity,
      prcItem: Number(bs.unitPrice),
      montoItem: Number(bs.totalPrice),
    }));

    // Add travel cost if any
    if (Number(booking.travelCost) > 0) {
      detalle.push({
        nroLinea: detalle.length + 1,
        tipoDoc: 'BOLETA',
        nmbItem: 'Costo de desplazamiento',
        qtyItem: 1,
        prcItem: Number(booking.travelCost),
        montoItem: Number(booking.travelCost),
      });
    }

    const document: SiiDocument = {
      type: DocumentType.BOLETA,
      folio: await this.getNextFolio(DocumentType.BOLETA),
      rut: rut || '66666666-6', // Público en general
      dv: rut ? '' : '6',
      razonSocial: rut ? 'Empresa X' : 'VENTA AL PÚBLICO',
      fecha: new Date(),
      glosa: `Servicio técnico automotriz - Reserva ${booking.bookingNumber}`,
      neto: Number(booking.subtotal) - Number(booking.tax),
      iva: Number(booking.tax),
      total: Number(booking.total),
      detalle,
    };

    // TODO: In production, send to SII
    // For now, generate mock response
    const documentNumber = `${this.siiRut}-${document.folio}`;
    
    this.logger.log(`[SII] Generated boleta: ${documentNumber} for booking ${bookingId}`);

    // Update booking with document info
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        documentType: DocumentType.BOLETA,
        documentNumber,
        siiDocumentId: documentNumber,
      },
    });

    // Update payment with document info if exists
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });
    
    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          documentType: DocumentType.BOLETA,
          documentNumber,
        },
      });
    }

    return {
      success: true,
      documentNumber,
      folio: document.folio,
      url: `https://sii.cl/boleta/${documentNumber}`,
    };
  }

  /**
   * Generate factura electrónica for a booking
   */
  async generateFactura(
    bookingId: string,
    companyInfo: {
      rut: string;
      razonSocial: string;
      giro?: string;
      direccion?: string;
      comuna?: string;
    },
  ): Promise<{
    success: boolean;
    documentNumber: string;
    folio: number;
    url?: string;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        services: {
          include: { service: true },
        },
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Validate company RUT
    if (!this.validateRut(companyInfo.rut)) {
      throw new BadRequestException('Invalid company RUT');
    }

    const detalle: SiiDetailItem[] = booking.services.map((bs, index) => ({
      nroLinea: index + 1,
      tipoDoc: 'FACTURA',
      nmbItem: bs.service.displayName,
      qtyItem: bs.quantity,
      prcItem: Number(bs.unitPrice),
      montoItem: Number(bs.totalPrice),
    }));

    const document: SiiDocument = {
      type: DocumentType.FACTURA,
      folio: await this.getNextFolio(DocumentType.FACTURA),
      rut: companyInfo.rut,
      dv: '',
      razonSocial: companyInfo.razonSocial,
      fecha: new Date(),
      glosa: `Servicio técnico automotriz - Reserva ${booking.bookingNumber}`,
      neto: Number(booking.subtotal) - Number(booking.tax),
      iva: Number(booking.tax),
      total: Number(booking.total),
      detalle,
    };

    // TODO: In production, send to SII
    const documentNumber = `${this.siiRut}-${document.folio}`;

    this.logger.log(`[SII] Generated factura: ${documentNumber} for booking ${bookingId}`);

    // Update booking with document info
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        documentType: DocumentType.FACTURA,
        documentNumber,
        siiDocumentId: documentNumber,
      },
    });

    // Update payment
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });
    
    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          documentType: DocumentType.FACTURA,
          documentNumber,
        },
      });
    }

    return {
      success: true,
      documentNumber,
      folio: document.folio,
      url: `https://sii.cl/factura/${documentNumber}`,
    };
  }

  /**
   * Void a document
   */
  async voidDocument(documentNumber: string, reason: string): Promise<{
    success: boolean;
    documentNumber: string;
    creditNoteNumber?: string;
  }> {
    // Find the booking with this document
    const booking = await this.prisma.booking.findFirst({
      where: { documentNumber },
    });

    if (!booking) {
      throw new BadRequestException('Document not found');
    }

    // TODO: In production, send void request to SII
    const creditNoteNumber = `${this.siiRut}-CN-${Date.now()}`;

    this.logger.log(`[SII] Voiding document: ${documentNumber}, reason: ${reason}`);

    // Update booking
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        documentType: DocumentType.NULA,
        siiDocumentId: creditNoteNumber,
      },
    });

    // Update payment
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId: booking.id },
    });
    
    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          documentType: DocumentType.NULA,
          documentNumber: creditNoteNumber,
        },
      });
    }

    return {
      success: true,
      documentNumber,
      creditNoteNumber,
    };
  }

  /**
   * Get next available folio
   */
  private async getNextFolio(type: DocumentType): Promise<number> {
    // In production, this should be managed by SII
    // For now, use a simple counter
    const key = `sii_folio_${type.toLowerCase()}`;
    
    // This is a placeholder - in production, store in database with proper locking
    const lastBooking = await this.prisma.booking.findFirst({
      where: { documentType: type },
      orderBy: { createdAt: 'desc' },
    });

    const lastFolio = lastBooking?.documentNumber
      ? parseInt(lastBooking.documentNumber.split('-').pop() || '0')
      : 0;

    return lastFolio + 1;
  }

  /**
   * Validate Chilean RUT
   */
  private validateRut(rut: string): boolean {
    const rutRegex = /^\d{7,8}-[\dkK]$/;
    if (!rutRegex.test(rut)) {
      return false;
    }

    const [number, dv] = rut.split('-');
    const body = number;

    let sum = 0;
    let multiple = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body.charAt(i)) * multiple;
      multiple = multiple === 7 ? 2 : multiple + 1;
    }

    const remainder = sum % 11;
    const calculatedDv = remainder === 0 ? '0' : 11 - remainder === 11 ? '0' : String(11 - remainder);

    return calculatedDv.toLowerCase() === dv.toLowerCase();
  }

  /**
   * Get document status from SII
   */
  async getDocumentStatus(documentNumber: string): Promise<{
    status: 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE' | 'ANULADO';
    trackId?: string;
    message?: string;
  }> {
    // TODO: Implement actual SII status check
    // For now, return mock response
    
    return {
      status: 'ACEPTADO',
      trackId: `TRACK-${Date.now()}`,
      message: 'Documento aceptado por SII',
    };
  }

  /**
   * Get daily sales report for SII
   */
  async getDailySalesReport(date: Date): Promise<{
    date: string;
    totalBoletas: number;
    totalFacturas: number;
    totalNetas: number;
    totalIva: number;
    total: number;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        documentType: {
          in: [DocumentType.BOLETA, DocumentType.FACTURA],
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const totals = bookings.reduce(
      (acc, b) => ({
        totalBoletas: acc.totalBoletas + (b.documentType === DocumentType.BOLETA ? 1 : 0),
        totalFacturas: acc.totalFacturas + (b.documentType === DocumentType.FACTURA ? 1 : 0),
        totalNetas: acc.totalNetas + Number(b.subtotal) - Number(b.tax),
        totalIva: acc.totalIva + Number(b.tax),
        total: acc.total + Number(b.total),
      }),
      { totalBoletas: 0, totalFacturas: 0, totalNetas: 0, totalIva: 0, total: 0 },
    );

    return {
      date: date.toISOString().split('T')[0],
      ...totals,
    };
  }
}
