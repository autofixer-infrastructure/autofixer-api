/**
 * Autofixer Pricing Constants
 * Based on POLITICAS-SERVICIO.md
 * All prices in CLP
 */

// Service Base Prices (from POLITICAS-SERVICIO.md section 2.1)
export const SERVICE_PRICES: Record<string, { 
  base: number; 
  min: number; 
  max: number;
  duration: number; // minutes
  requiresDeposit: boolean;
}> = {
  'SVC-001': { base: 25000, min: 25000, max: 25000, duration: 60, requiresDeposit: true },    // Diagnóstico
  'SVC-002': { base: 35000, min: 35000, max: 35000, duration: 90, requiresDeposit: true },  // Carga Simple R134a
  'SVC-003': { base: 70000, min: 70000, max: 70000, duration: 90, requiresDeposit: true },  // Carga Doble R134a
  'SVC-004': { base: 90000, min: 90000, max: 90000, duration: 90, requiresDeposit: true },  // Carga R1234yf
  'SVC-005': { base: 45000, min: 45000, max: 45000, duration: 45, requiresDeposit: false }, // Sanitización Sedán
  'SVC-006': { base: 55000, min: 55000, max: 55000, duration: 45, requiresDeposit: false }, // Sanitización SUV
  'SVC-007': { base: 80000, min: 80000, max: 80000, duration: 120, requiresDeposit: true }, // Flushing
  'SVC-013': { base: 30000, min: 30000, max: 30000, duration: 30, requiresDeposit: true },   // Cambio Filtro Secador
  'SVC-014': { base: 25000, min: 25000, max: 25000, duration: 30, requiresDeposit: true },  // Cambio Correa
  'SVC-015': { base: 180000, min: 180000, max: 180000, duration: 0, requiresDeposit: false }, // Plan Mantención Anual
};

// Services that require a quote (not fixed price)
export const QUOTE_REQUIRED_SERVICES = ['SVC-008', 'SVC-009', 'SVC-010', 'SVC-011', 'SVC-012'];

// Complementary services (from section 2.2)
export const COMPLEMENTARY_SERVICES: Record<string, { price: number; description: string }> = {
  'oil_recharge': { price: 25000, description: 'Recarga de Aceite PAG' },
  'uv_preventive': { price: 5000, description: 'Aplicación de UV Preventivo' },
  'pollen_filter': { price: 15000, description: 'Instalación de Filtro Antipolen' },
  'obd2_diagnostic': { price: 20000, description: 'Diagnóstico OBD2' },
  'hermeticity_test': { price: 15000, description: 'Prueba de Hermeticidad' },
};

// Displacement costs by zone (from POLITICAS-SERVICIO.md section 1.2)
export const DISPLACEMENT_COSTS: Record<string, number> = {
  // Zona 1: 0-5 km - $0
  'recoleta': 0,
  'independencia': 0,
  'santiago': 0,
  'santiago_centro': 0,
  
  // Zona 2: 5-10 km - $5.000
  'providencia': 5000,
  'nuñoa': 5000,
  'nunoa': 5000,
  'las_condes': 5000,
  'vitacura': 5000,
  'la_reina': 5000,
  'macul': 5000,
  
  // Zona 3: 10-15 km - $10.000
  'la_florida': 10000,
  'penalolen': 10000,
  'puente_alto': 10000,
  'san_bernardo': 10000,
  
  // Zona 4: 15-25 km - $15.000
  'pudahuel': 15000,
  'quilicura': 15000,
  'lampa': 15000,
  'batuco': 15000,
  
  // Zona 5: 25-40 km - $25.000
  'colina': 25000,
  'chicureo': 25000,
  'pirque': 25000,
  'san_jose_de_maipo': 25000,
};

// Default displacement cost (for unknown communes)
export const DEFAULT_DISPLACEMENT_COST = 10000; // Zona 3 default

// Vehicle type multipliers (from quotes.service.ts original)
export const VEHICLE_MULTIPLIERS: Record<string, number> = {
  'sedan': 1.0,
  'hatchback': 1.0,
  'suv': 1.2,
  'pickup': 1.3,
  'van': 1.4,
  'truck': 1.5,
  'motorcycle': 0.6,
};

// Vehicle type multipliers as enums (for Prisma VehicleType)
export const VEHICLE_MULTIPLIERS_ENUM: Record<number, number> = {
  0: 1.0,   // SEDAN
  1: 1.2,   // SUV
  2: 1.3,   // PICKUP
  3: 1.4,   // VAN
  4: 1.5,   // TRUCK
  5: 0.6,   // MOTORCYCLE
};

// Service duration in minutes by ServiceType enum
export const SERVICE_DURATIONS: Record<string, number> = {
  'DIAGNOSTIC': 60,
  'R134A_REFILL': 90,
  'R1234YF_REFILL': 90,
  'SANITIZATION': 45,
  'COMPRESSOR_REPAIR': 180,
  'EVAPORATOR_CLEANING': 120,
  'CONDENSER_REPAIR': 150,
  'LEAK_REPAIR': 90,
  'OTHER': 60,
};

// Deposit amount (from section 4.1)
export const DEPOSIT_AMOUNT = 12500;

// IVA rate
export const IVA_RATE = 0.19;

// Quote validity in days
export const QUOTE_VALIDITY_DAYS = 7;

// Max service radius in km
export const MAX_SERVICE_RADIUS_KM = 40;

// Base location coordinates (Recoleta)
export const BASE_LOCATION = {
  lat: -33.4489,
  lng: -70.6483,
  address: 'Fray Camilo Enrique 655, Recoleta, Santiago',
};
