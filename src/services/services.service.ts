import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceType, VehicleType } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all services
   */
  async findAll(params?: { category?: string; vehicleType?: VehicleType }) {
    const where: any = { isActive: true };
    
    if (params?.category) {
      where.category = params.category;
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { isPopular: 'desc' }, { name: 'asc' }],
    });

    // Apply vehicle type multiplier if needed
    if (params?.vehicleType) {
      const multiplier = this.getVehicleMultiplier(params.vehicleType);
      return services.map((s) => ({
        ...s,
        basePrice: Number(s.basePrice),
        minPrice: s.minPrice ? Number(s.minPrice) * multiplier : null,
        maxPrice: s.maxPrice ? Number(s.maxPrice) * multiplier : null,
      }));
    }

    return services.map((s) => ({
      ...s,
      basePrice: Number(s.basePrice),
      minPrice: s.minPrice ? Number(s.minPrice) : null,
      maxPrice: s.maxPrice ? Number(s.maxPrice) : null,
    }));
  }

  /**
   * Get service by ID
   */
  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        symptoms: true,
      },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    return {
      ...service,
      basePrice: Number(service.basePrice),
      minPrice: service.minPrice ? Number(service.minPrice) : null,
      maxPrice: service.maxPrice ? Number(service.maxPrice) : null,
    };
  }

  /**
   * Get service by type
   */
  async findByType(type: ServiceType) {
    return this.prisma.service.findMany({
      where: { type, isActive: true },
    });
  }

  /**
   * Get popular services
   */
  async getPopular(limit: number = 6) {
    return this.prisma.service.findMany({
      where: { isActive: true, isPopular: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get featured services
   */
  async getFeatured(limit: number = 6) {
    return this.prisma.service.findMany({
      where: { isActive: true, isFeatured: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get symptoms for quote calculator
   */
  async getSymptoms() {
    return this.prisma.symptom.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get services by symptom
   */
  async getServicesBySymptom(symptom: string) {
    const symptomRecord = await this.prisma.symptom.findUnique({
      where: { keyword: symptom },
      include: { services: true },
    });

    return symptomRecord?.services || [];
  }

  /**
   * Get vehicle type multiplier
   */
  private getVehicleMultiplier(type: VehicleType): number {
    const multipliers: Record<VehicleType, number> = {
      [VehicleType.SEDAN]: 1.0,
      [VehicleType.SUV]: 1.2,
      [VehicleType.PICKUP]: 1.3,
      [VehicleType.VAN]: 1.4,
      [VehicleType.TRUCK]: 1.5,
      [VehicleType.MOTORCYCLE]: 0.6,
    };
    return multipliers[type] || 1.0;
  }
}
