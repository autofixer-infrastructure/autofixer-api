import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PublicCreateQuoteDto } from './dto/public-create-quote.dto';
import { CalculateQuoteDto } from './dto/calculate-quote.dto';
import { VehicleType, ServiceType } from '@prisma/client';
import {
  SERVICE_PRICES,
  DISPLACEMENT_COSTS,
  DEFAULT_DISPLACEMENT_COST,
  IVA_RATE,
  QUOTE_VALIDITY_DAYS,
} from '../constants/pricing';

interface ServicePrice {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  vehicleMultiplier: number;
  finalPrice: number;
}

// Service ID to ServiceType mapping (based on POLITICAS-SERVICIO.md)
const SERVICE_ID_TO_TYPE: Record<string, ServiceType> = {
  'SVC-001': ServiceType.DIAGNOSTIC,
  'SVC-002': ServiceType.R134A_REFILL,
  'SVC-003': ServiceType.R134A_REFILL,
  'SVC-004': ServiceType.R1234YF_REFILL,
  'SVC-005': ServiceType.SANITIZATION,
  'SVC-006': ServiceType.SANITIZATION,
  'SVC-007': ServiceType.OTHER,
  'SVC-008': ServiceType.COMPRESSOR_REPAIR,
  'SVC-009': ServiceType.CONDENSER_REPAIR,
  'SVC-010': ServiceType.EVAPORATOR_CLEANING,
  'SVC-011': ServiceType.OTHER,
  'SVC-012': ServiceType.LEAK_REPAIR,
  'SVC-013': ServiceType.OTHER,
  'SVC-014': ServiceType.OTHER,
  'SVC-015': ServiceType.OTHER,
};

// ServiceType to base pricing (from SERVICE_PRICES)
const SERVICE_TYPE_BASE_PRICES: Record<ServiceType, { base: number; min: number; max: number }> = {
  [ServiceType.DIAGNOSTIC]: { base: 25000, min: 25000, max: 25000 },
  [ServiceType.R134A_REFILL]: { base: 35000, min: 35000, max: 70000 }, // SVC-002 to SVC-003
  [ServiceType.R1234YF_REFILL]: { base: 90000, min: 90000, max: 90000 },
  [ServiceType.SANITIZATION]: { base: 45000, min: 45000, max: 55000 }, // SVC-005 to SVC-006
  [ServiceType.COMPRESSOR_REPAIR]: { base: 0, min: 120000, max: 350000 },
  [ServiceType.EVAPORATOR_CLEANING]: { base: 0, min: 150000, max: 300000 },
  [ServiceType.CONDENSER_REPAIR]: { base: 0, min: 80000, max: 180000 },
  [ServiceType.LEAK_REPAIR]: { base: 0, min: 40000, max: 100000 },
  [ServiceType.OTHER]: { base: 0, min: 25000, max: 180000 },
};

@Injectable()
export class QuotesService {
  // Vehicle type multipliers (from constants)
  private readonly VEHICLE_MULTIPLIERS: Record<VehicleType, number> = {
    [VehicleType.SEDAN]: 1.0,
    [VehicleType.SUV]: 1.2,
    [VehicleType.PICKUP]: 1.3,
    [VehicleType.VAN]: 1.4,
    [VehicleType.TRUCK]: 1.5,
    [VehicleType.MOTORCYCLE]: 0.6,
  };

  // Parts cost estimates (kept for reference)
  private readonly PARTS_COSTS: Record<string, { min: number; max: number }> = {
    'r134a_gas_350g': { min: 8000, max: 12000 },
    'r1234yf_gas_350g': { min: 25000, max: 40000 },
    'compressor': { min: 80000, max: 180000 },
    'condenser': { min: 40000, max: 90000 },
    'evaporator': { min: 35000, max: 75000 },
    'drier': { min: 15000, max: 30000 },
    'orings': { min: 5000, max: 15000 },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Map string vehicle types to enum (handles frontend values)
   */
  private mapVehicleType(type: string): VehicleType {
    const map: Record<string, VehicleType> = {
      'sedan': VehicleType.SEDAN,
      'hatchback': VehicleType.SEDAN,
      'suv': VehicleType.SUV,
      'pickup': VehicleType.PICKUP,
      'van': VehicleType.VAN,
      'truck': VehicleType.TRUCK,
      'motorcycle': VehicleType.MOTORCYCLE,
      'moto': VehicleType.MOTORCYCLE,
      'SEDAN': VehicleType.SEDAN,
      'SUV': VehicleType.SUV,
      'PICKUP': VehicleType.PICKUP,
      'VAN': VehicleType.VAN,
      'TRUCK': VehicleType.TRUCK,
      'MOTORCYCLE': VehicleType.MOTORCYCLE,
    };
    return map[type?.toUpperCase()] || map[type?.toLowerCase()] || VehicleType.SEDAN;
  }

  /**
   * Map string service types to enum (handles frontend values)
   */
  private mapServiceType(type: string): ServiceType {
    const map: Record<string, ServiceType> = {
      'diagnostico': ServiceType.DIAGNOSTIC,
      'diagnostic': ServiceType.DIAGNOSTIC,
      'carga-r134a': ServiceType.R134A_REFILL,
      'r134a': ServiceType.R134A_REFILL,
      'carga-r1234yf': ServiceType.R1234YF_REFILL,
      'r1234yf': ServiceType.R1234YF_REFILL,
      'sanitizacion': ServiceType.SANITIZATION,
      'compresor': ServiceType.COMPRESSOR_REPAIR,
      'evaporador': ServiceType.EVAPORATOR_CLEANING,
      'condensador': ServiceType.CONDENSER_REPAIR,
      'fugas': ServiceType.LEAK_REPAIR,
      'reparacion': ServiceType.OTHER,
      'DIAGNOSTIC': ServiceType.DIAGNOSTIC,
      'R134A_REFILL': ServiceType.R134A_REFILL,
      'R1234YF_REFILL': ServiceType.R1234YF_REFILL,
      'SANITIZATION': ServiceType.SANITIZATION,
      'COMPRESSOR_REPAIR': ServiceType.COMPRESSOR_REPAIR,
      'EVAPORATOR_CLEANING': ServiceType.EVAPORATOR_CLEANING,
      'CONDENSER_REPAIR': ServiceType.CONDENSER_REPAIR,
      'LEAK_REPAIR': ServiceType.LEAK_REPAIR,
      'OTHER': ServiceType.OTHER,
    };
    return map[type?.toUpperCase()] || map[type?.toLowerCase()] || ServiceType.OTHER;
  }

  /**
   * Calculate quote based on symptoms and services (public version with string input)
   */
  async calculatePublic(dto: {
    vehicleType: string;
    commune?: string;
    symptoms?: string[];
    services?: { serviceType: string }[];
    refrigerantType?: string;
  }): Promise<{
    services: ServicePrice[];
    pricing: {
      laborCost: number;
      partsCost: number;
      materialsCost: number;
      travelCost: number;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
    };
    estimatedDuration: number;
    validUntil: Date;
  }> {
    // Convert string types to enums
    const vehicleType = this.mapVehicleType(dto.vehicleType);
    const refrigerantType = dto.refrigerantType ? this.mapServiceType(dto.refrigerantType) : undefined;
    
    // Convert service types
    const services = dto.services?.map(s => ({
      serviceType: this.mapServiceType(s.serviceType)
    }));
    
    // Convert symptoms to service types
    const symptoms = dto.symptoms?.map(s => this.mapServiceType(s).toString());

    return this.calculate({
      vehicleType,
      commune: dto.commune,
      symptoms,
      refrigerantType,
      services,
    });
  }

  // Get displacement cost based on commune name
  private getDisplacementCost(commune: string | undefined): number {
    if (!commune) return DEFAULT_DISPLACEMENT_COST;
    const normalizedCommune = commune.toLowerCase().replace(/\s+/g, '_');
    return DISPLACEMENT_COSTS[normalizedCommune] ?? DEFAULT_DISPLACEMENT_COST;
  }

  /**
   * Calculate quote based on symptoms and services
   */
  async calculate(calculateQuoteDto: CalculateQuoteDto): Promise<{
    services: ServicePrice[];
    pricing: {
      laborCost: number;
      partsCost: number;
      materialsCost: number;
      travelCost: number;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
    };
    estimatedDuration: number;
    validUntil: Date;
  }> {
    const { vehicleType, commune, symptoms, services: requestedServices, refrigerantType } = calculateQuoteDto;

    const vehicleMultiplier = this.VEHICLE_MULTIPLIERS[vehicleType] || 1.0;
    const travelCost = this.getDisplacementCost(commune);

    // Calculate service prices
    const servicePrices: ServicePrice[] = [];
    let totalLabor = 0;
    let totalParts = 0;
    let totalMaterials = 0;
    let estimatedDuration = 0;

    // If services requested directly
    if (requestedServices && requestedServices.length > 0) {
      for (const service of requestedServices) {
        const priceInfo = await this.getServicePrice(service.serviceType, vehicleType);
        servicePrices.push({
          serviceId: service.serviceType,
          serviceName: this.getServiceDisplayName(service.serviceType),
          basePrice: priceInfo.base,
          vehicleMultiplier: vehicleMultiplier,
          finalPrice: priceInfo.final,
        });
        totalLabor += priceInfo.labor;
        totalParts += priceInfo.parts;
        totalMaterials += priceInfo.materials;
        estimatedDuration += priceInfo.duration;
      }
    } else if (symptoms && symptoms.length > 0) {
      // Map symptoms to services
      const mappedServices = await this.mapSymptomsToServices(symptoms, refrigerantType);
      
      for (const serviceType of mappedServices) {
        const priceInfo = await this.getServicePrice(serviceType, vehicleType);
        servicePrices.push({
          serviceId: serviceType,
          serviceName: this.getServiceDisplayName(serviceType),
          basePrice: priceInfo.base,
          vehicleMultiplier: vehicleMultiplier,
          finalPrice: priceInfo.final,
        });
        totalLabor += priceInfo.labor;
        totalParts += priceInfo.parts;
        totalMaterials += priceInfo.materials;
        estimatedDuration += priceInfo.duration;
      }
    } else {
      throw new BadRequestException('Either symptoms or services must be provided');
    }

    // Calculate totals
    const subtotal = totalLabor + totalParts + totalMaterials + travelCost;
    const discount = 0; // Could implement discount logic here
    const tax = (subtotal - discount) * IVA_RATE; // IVA 19%
    const total = subtotal - discount + tax;

    // Valid for 7 days (from constants)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + QUOTE_VALIDITY_DAYS);

    return {
      services: servicePrices,
      pricing: {
        laborCost: totalLabor,
        partsCost: totalParts,
        materialsCost: totalMaterials,
        travelCost,
        subtotal,
        discount,
        tax,
        total: Math.round(total),
      },
      estimatedDuration,
      validUntil,
    };
  }

  /**
   * Create a quote (persist to database)
   */
  async create(createQuoteDto: CreateQuoteDto) {
    // Calculate the quote first
    const calculated = await this.calculate({
      vehicleType: createQuoteDto.vehicleType,
      commune: createQuoteDto.commune,
      symptoms: createQuoteDto.symptoms,
      refrigerantType: createQuoteDto.refrigerantType,
    });

    return this.prisma.quote.create({
      data: {
        clientId: createQuoteDto.clientId,
        clientEmail: createQuoteDto.clientEmail,
        clientPhone: createQuoteDto.clientPhone,
        commune: createQuoteDto.commune,
        address: createQuoteDto.address,
        lat: createQuoteDto.lat,
        lng: createQuoteDto.lng,
        vehicleType: createQuoteDto.vehicleType,
        vehicleBrand: createQuoteDto.vehicleBrand,
        vehicleModel: createQuoteDto.vehicleModel,
        refrigerantType: createQuoteDto.refrigerantType,
        symptoms: createQuoteDto.symptoms,
        description: createQuoteDto.description,
        selectedServices: calculated.services,
        laborCost: calculated.pricing.laborCost,
        partsCost: calculated.pricing.partsCost,
        materialsCost: calculated.pricing.materialsCost,
        travelCost: calculated.pricing.travelCost,
        discount: calculated.pricing.discount,
        subtotal: calculated.pricing.subtotal,
        tax: calculated.pricing.tax,
        total: calculated.pricing.total,
        validUntil: calculated.validUntil,
        utmSource: createQuoteDto.utmSource,
        utmMedium: createQuoteDto.utmMedium,
        utmCampaign: createQuoteDto.utmCampaign,
      },
    });
  }

  /**
   * Create a public quote from website (no auth required)
   * Converts string types to enums and creates the quote
   */
  async createPublic(dto: PublicCreateQuoteDto) {
    // Convert string vehicle type to enum
    const vehicleType = this.mapVehicleType(dto.vehicleType);
    const refrigerantType = dto.refrigerantType 
      ? this.mapServiceType(dto.refrigerantType) 
      : undefined;

    // Calculate the quote
    const calculated = await this.calculate({
      vehicleType,
      commune: dto.commune,
      symptoms: dto.symptoms,
      refrigerantType,
    });

    // Create the quote
    return this.prisma.quote.create({
      data: {
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone,
        commune: dto.commune,
        address: dto.address,
        vehicleType,
        vehicleBrand: dto.vehicleBrand,
        vehicleModel: dto.vehicleModel,
        refrigerantType,
        symptoms: dto.symptoms,
        description: dto.description,
        selectedServices: calculated.services,
        laborCost: calculated.pricing.laborCost,
        partsCost: calculated.pricing.partsCost,
        materialsCost: calculated.pricing.materialsCost,
        travelCost: calculated.pricing.travelCost,
        discount: calculated.pricing.discount,
        subtotal: calculated.pricing.subtotal,
        tax: calculated.pricing.tax,
        total: calculated.pricing.total,
        validUntil: calculated.validUntil,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
      },
    });
  }

  /**
   * Get quote by ID
   */
  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  /**
   * Get all quotes with pagination
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    clientId?: string;
    isConverted?: boolean;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { page = 1, limit = 20, clientId, isConverted, fromDate, toDate } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (isConverted !== undefined) where.isConverted = isConverted;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get service price calculation
   */
  private async getServicePrice(serviceType: ServiceType, vehicleType: VehicleType): Promise<{
    base: number;
    final: number;
    labor: number;
    parts: number;
    materials: number;
    duration: number;
  }> {
    const priceData = SERVICE_TYPE_BASE_PRICES[serviceType] || SERVICE_TYPE_BASE_PRICES[ServiceType.OTHER];
    const vehicleMultiplier = this.VEHICLE_MULTIPLIERS[vehicleType] || 1.0;

    const basePrice = priceData.base;
    const finalPrice = Math.round(basePrice * vehicleMultiplier);

    // Labor is typically 60-70% of the service cost
    const labor = Math.round(finalPrice * 0.65);
    
    // Parts vary by service type
    let parts = 0;
    let materials = 0;
    
    if (serviceType === ServiceType.R134A_REFILL) {
      materials = Math.round(finalPrice * 0.25); // Gas cost
      parts = Math.round(finalPrice * 0.05); // Minor parts (o-rings, etc.)
    } else if (serviceType === ServiceType.R1234YF_REFILL) {
      materials = Math.round(finalPrice * 0.35); // More expensive gas
      parts = Math.round(finalPrice * 0.05);
    } else if ([ServiceType.COMPRESSOR_REPAIR, ServiceType.CONDENSER_REPAIR].includes(serviceType)) {
      parts = Math.round(finalPrice * 0.4); // Major parts
      materials = Math.round(finalPrice * 0.1);
    }

    // Duration in minutes (from SERVICE_DURATIONS)
    const durationMap: Record<ServiceType, number> = {
      [ServiceType.DIAGNOSTIC]: 60,
      [ServiceType.R134A_REFILL]: 90,
      [ServiceType.R1234YF_REFILL]: 90,
      [ServiceType.SANITIZATION]: 45,
      [ServiceType.COMPRESSOR_REPAIR]: 180,
      [ServiceType.EVAPORATOR_CLEANING]: 120,
      [ServiceType.CONDENSER_REPAIR]: 150,
      [ServiceType.LEAK_REPAIR]: 90,
      [ServiceType.OTHER]: 60,
    };

    return {
      base: basePrice,
      final: finalPrice,
      labor,
      parts,
      materials,
      duration: durationMap[serviceType] || 60,
    };
  }

  /**
   * Map symptoms to recommended services
   */
  private async mapSymptomsToServices(symptoms: string[], refrigerantType?: ServiceType): Promise<ServiceType[]> {
    const symptomMap: Record<string, ServiceType[]> = {
      'no_cooling': [ServiceType.DIAGNOSTIC],
      'weak_airflow': [ServiceType.DIAGNOSTIC, ServiceType.SANITIZATION],
      'bad_smell': [ServiceType.SANITIZATION],
      'warm_air': [ServiceType.DIAGNOSTIC],
      'noisy_compressor': [ServiceType.DIAGNOSTIC, ServiceType.COMPRESSOR_REPAIR],
      'leak': [ServiceType.LEAK_REPAIR, ServiceType.DIAGNOSTIC],
      'compressor_failure': [ServiceType.COMPRESSOR_REPAIR],
      'icing': [ServiceType.DIAGNOSTIC],
      'electrical': [ServiceType.DIAGNOSTIC],
      'routine': [ServiceType.DIAGNOSTIC, ServiceType.R134A_REFILL],
    };

    const services = new Set<ServiceType>();

    for (const symptom of symptoms) {
      const mapped = symptomMap[symptom.toLowerCase()] || [ServiceType.DIAGNOSTIC];
      mapped.forEach((s) => services.add(s));
    }

    // Add refill if refrigerant type specified
    if (refrigerantType) {
      services.add(refrigerantType);
    }

    return Array.from(services);
  }

  /**
   * Get human-readable service name
   */
  private getServiceDisplayName(serviceType: ServiceType): string {
    const names: Record<ServiceType, string> = {
      [ServiceType.DIAGNOSTIC]: 'Diagnóstico',
      [ServiceType.R134A_REFILL]: 'Carga R134a',
      [ServiceType.R1234YF_REFILL]: 'Carga R1234yf',
      [ServiceType.SANITIZATION]: 'Sanitización',
      [ServiceType.COMPRESSOR_REPAIR]: 'Reparación Compresor',
      [ServiceType.EVAPORATOR_CLEANING]: 'Limpieza Evaporador',
      [ServiceType.CONDENSER_REPAIR]: 'Reparación Condensador',
      [ServiceType.LEAK_REPAIR]: 'Reparación de Fugas',
      [ServiceType.OTHER]: 'Otro Servicio',
    };

    return names[serviceType] || 'Servicio';
  }
}
