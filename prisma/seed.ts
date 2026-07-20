/**
 * Autofixer Database Seed
 * Seeds initial data based on POLITICAS-SERVICIO.md
 */

import { PrismaClient, ServiceType, VehicleType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ==========================================
  // ZONES
  // ==========================================
  console.log('Creating zones...');

  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { name: 'zona_1' },
      update: {},
      create: {
        name: 'zona_1',
        displayName: 'Zona 1 - Centro',
        color: '#22C55E', // green
        priceAdjustment: 0,
      },
    }),
    prisma.zone.upsert({
      where: { name: 'zona_2' },
      update: {},
      create: {
        name: 'zona_2',
        displayName: 'Zona 2 - Nororiente',
        color: '#3B82F6', // blue
        priceAdjustment: 0,
      },
    }),
    prisma.zone.upsert({
      where: { name: 'zona_3' },
      update: {},
      create: {
        name: 'zona_3',
        displayName: 'Zona 3 - Sur',
        color: '#F59E0B', // amber
        priceAdjustment: 0,
      },
    }),
    prisma.zone.upsert({
      where: { name: 'zona_4' },
      update: {},
      create: {
        name: 'zona_4',
        displayName: 'Zona 4 - Pudahuel/Quilicura',
        color: '#EF4444', // red
        priceAdjustment: 0,
      },
    }),
    prisma.zone.upsert({
      where: { name: 'zona_5' },
      update: {},
      create: {
        name: 'zona_5',
        displayName: 'Zona 5 - Periferia',
        color: '#8B5CF6', // purple
        priceAdjustment: 0,
      },
    }),
  ]);

  console.log(`Created ${zones.length} zones`);

  // ==========================================
  // COMMUNES
  // ==========================================
  console.log('Creating communes...');

  const communesData = [
    // Zona 1
    { name: 'recoleta', region: 'RM', zoneId: zones[0].id, travelFee: 0 },
    { name: 'independencia', region: 'RM', zoneId: zones[0].id, travelFee: 0 },
    { name: 'santiago', region: 'RM', zoneId: zones[0].id, travelFee: 0 },
    // Zona 2
    { name: 'providencia', region: 'RM', zoneId: zones[1].id, travelFee: 5000 },
    { name: 'nunoa', region: 'RM', zoneId: zones[1].id, travelFee: 5000 },
    { name: 'las_condes', region: 'RM', zoneId: zones[1].id, travelFee: 5000 },
    { name: 'vitacura', region: 'RM', zoneId: zones[1].id, travelFee: 5000 },
    { name: 'la_reina', region: 'RM', zoneId: zones[1].id, travelFee: 5000 },
    { name: 'macul', region: 'RM', zoneId: zones[1].id, travelFee: 5000 },
    // Zona 3
    { name: 'la_florida', region: 'RM', zoneId: zones[2].id, travelFee: 10000 },
    { name: 'penalolen', region: 'RM', zoneId: zones[2].id, travelFee: 10000 },
    { name: 'puente_alto', region: 'RM', zoneId: zones[2].id, travelFee: 10000 },
    { name: 'san_bernardo', region: 'RM', zoneId: zones[2].id, travelFee: 10000 },
    // Zona 4
    { name: 'pudahuel', region: 'RM', zoneId: zones[3].id, travelFee: 15000 },
    { name: 'quilicura', region: 'RM', zoneId: zones[3].id, travelFee: 15000 },
    { name: 'lampa', region: 'RM', zoneId: zones[3].id, travelFee: 15000 },
    { name: 'batuco', region: 'RM', zoneId: zones[3].id, travelFee: 15000 },
    // Zona 5
    { name: 'colina', region: 'RM', zoneId: zones[4].id, travelFee: 25000 },
    { name: 'chicureo', region: 'RM', zoneId: zones[4].id, travelFee: 25000 },
    { name: 'pirque', region: 'RM', zoneId: zones[4].id, travelFee: 25000 },
    { name: 'san_jose_de_maipo', region: 'RM', zoneId: zones[4].id, travelFee: 25000 },
  ];

  for (const commune of communesData) {
    await prisma.commune.upsert({
      where: { name: commune.name },
      update: { travelFee: commune.travelFee },
      create: commune,
    });
  }

  console.log(`Created ${communesData.length} communes`);

  // ==========================================
  // SYMPTOMS
  // ==========================================
  console.log('Creating symptoms...');

  const symptomsData = [
    { keyword: 'no_cooling', displayName: 'No enfria', description: 'El aire acondicionado no produce aire frío' },
    { keyword: 'weak_airflow', displayName: 'Flujo débil', description: 'El flujo de aire es más bajo de lo normal' },
    { keyword: 'bad_smell', displayName: 'Mal olor', description: 'Olores desagradables del sistema de climatización' },
    { keyword: 'warm_air', displayName: 'Aire tibio', description: 'El aire sale tibio en lugar de frío' },
    { keyword: 'noisy_compressor', displayName: 'Compresor ruidoso', description: 'Ruido anormal del compresor' },
    { keyword: 'leak', displayName: 'Fuga de gas', description: 'Se detecta fuga de refrigerante' },
    { keyword: 'icing', displayName: 'Hielo en evaporador', description: 'Se forma hielo en el evaporador' },
    { keyword: 'electrical', displayName: 'Problema eléctrico', description: 'Falla en el sistema eléctrico del A/C' },
    { keyword: 'routine', displayName: 'Mantención rutinaria', description: 'Revisión y carga de gas periódica' },
  ];

  for (const symptom of symptomsData) {
    await prisma.symptom.upsert({
      where: { keyword: symptom.keyword },
      update: symptom,
      create: symptom,
    });
  }

  console.log(`Created ${symptomsData.length} symptoms`);

  // ==========================================
  // SERVICES
  // ==========================================
  console.log('Creating services...');

  const servicesData = [
    {
      id: 'SVC-001',
      name: 'diagnostico',
      displayName: 'Diagnóstico',
      description: 'Revisión completa del sistema A/C con equipos profesionales. Incluye medición de presiones, temperatura de salida, inspección visual de componentes.',
      type: ServiceType.DIAGNOSTIC,
      category: 'diagnostic',
      basePrice: 25000,
      estimatedDurationMinutes: 60,
      requiresDeposit: true,
    },
    {
      id: 'SVC-002',
      name: 'carga-simple-r134a',
      displayName: 'Carga Simple R134a',
      description: 'Carga de gas refrigerante R134a (aprox. 500g). Incluye vacío del sistema, prueba de presiones, y verificación de funcionamiento.',
      type: ServiceType.R134A_REFILL,
      category: 'refill',
      basePrice: 35000,
      estimatedDurationMinutes: 90,
      requiresDeposit: true,
    },
    {
      id: 'SVC-003',
      name: 'carga-doble-r134a',
      displayName: 'Carga Doble R134a',
      description: 'Carga de gas refrigerante R134a (aprox. 700g). Para vehículos que requieren mayor cantidad.',
      type: ServiceType.R134A_REFILL,
      category: 'refill',
      basePrice: 70000,
      estimatedDurationMinutes: 90,
      requiresDeposit: true,
    },
    {
      id: 'SVC-004',
      name: 'carga-r1234yf',
      displayName: 'Carga R1234yf',
      description: 'Carga de gas refrigerante R1234yf (vehículos 2017+). Refrigerante de nueva generación.',
      type: ServiceType.R1234YF_REFILL,
      category: 'refill',
      basePrice: 90000,
      estimatedDurationMinutes: 90,
      requiresDeposit: true,
    },
    {
      id: 'SVC-005',
      name: 'sanitizacion-sedan',
      displayName: 'Sanitización Sedán',
      description: 'Sanitización completa del sistema de climatización con producto antibacterial. Incluye filtro antipolen.',
      type: ServiceType.SANITIZATION,
      category: 'sanitization',
      basePrice: 45000,
      estimatedDurationMinutes: 45,
      requiresDeposit: false,
    },
    {
      id: 'SVC-006',
      name: 'sanitizacion-suv',
      displayName: 'Sanitización SUV/Camioneta',
      description: 'Sanitización completa para vehículos SUV, camionetas, y vans. Mayor volumen.',
      type: ServiceType.SANITIZATION,
      category: 'sanitization',
      basePrice: 55000,
      estimatedDurationMinutes: 45,
      requiresDeposit: false,
    },
    {
      id: 'SVC-007',
      name: 'flushing',
      displayName: 'Flushing/Barrido',
      description: 'Limpieza profunda del sistema con solvente especializado. Necesario antes de carga si hubo contaminación.',
      type: ServiceType.OTHER,
      category: 'maintenance',
      basePrice: 80000,
      estimatedDurationMinutes: 120,
      requiresDeposit: true,
    },
    {
      id: 'SVC-008',
      name: 'reemplazo-compresor',
      displayName: 'Reemplazo Compresor',
      description: 'Reemplazo completo del compresor de A/C. Incluye compresor nuevo, aceite PAG, filtro secador, y carga completa de gas.',
      type: ServiceType.COMPRESSOR_REPAIR,
      category: 'repair',
      basePrice: 0, // Quote required
      minPrice: 120000,
      maxPrice: 350000,
      estimatedDurationMinutes: 180,
      requiresDeposit: true,
    },
    {
      id: 'SVC-009',
      name: 'reemplazo-condensador',
      displayName: 'Reemplazo Condensador',
      description: 'Reemplazo del condensador de A/C. Incluye nuevo condensador, empalmes, vacío, y carga de gas.',
      type: ServiceType.CONDENSER_REPAIR,
      category: 'repair',
      basePrice: 0,
      minPrice: 80000,
      maxPrice: 180000,
      estimatedDurationMinutes: 150,
      requiresDeposit: true,
    },
    {
      id: 'SVC-010',
      name: 'reemplazo-evaporador',
      displayName: 'Reemplazo Evaporador',
      description: 'Reemplazo del evaporador (trabajo interno). Requiere desmote del tablero.',
      type: ServiceType.EVAPORATOR_CLEANING,
      category: 'repair',
      basePrice: 0,
      minPrice: 150000,
      maxPrice: 300000,
      estimatedDurationMinutes: 240,
      requiresDeposit: true,
    },
    {
      id: 'SVC-011',
      name: 'reemplazo-valvula',
      displayName: 'Reemplazo Válvula de Expansión',
      description: 'Reemplazo de la válvula de expansión termostática.',
      type: ServiceType.OTHER,
      category: 'repair',
      basePrice: 0,
      minPrice: 60000,
      maxPrice: 120000,
      estimatedDurationMinutes: 120,
      requiresDeposit: true,
    },
    {
      id: 'SVC-012',
      name: 'reparacion-fugas',
      displayName: 'Reparación de Fugas',
      description: 'Detección y reparación de fuga de refrigerante. Incluye tinte UV, detector, sellador profesional.',
      type: ServiceType.LEAK_REPAIR,
      category: 'repair',
      basePrice: 0,
      minPrice: 40000,
      maxPrice: 100000,
      estimatedDurationMinutes: 90,
      requiresDeposit: true,
    },
    {
      id: 'SVC-013',
      name: 'cambio-filtro-secador',
      displayName: 'Cambio de Filtro Secador',
      description: 'Reemplazo del filtro secador/antihumedal. Siempre se cambia al abrir el sistema.',
      type: ServiceType.OTHER,
      category: 'maintenance',
      basePrice: 30000,
      estimatedDurationMinutes: 30,
      requiresDeposit: true,
    },
    {
      id: 'SVC-014',
      name: 'cambio-correa',
      displayName: 'Cambio de Correa',
      description: 'Reemplazo de la correa del compresor de A/C.',
      type: ServiceType.OTHER,
      category: 'maintenance',
      basePrice: 25000,
      estimatedDurationMinutes: 30,
      requiresDeposit: true,
    },
    {
      id: 'SVC-015',
      name: 'plan-mantencion',
      displayName: 'Plan de Mantención Anual',
      description: 'Suscripción anual con 2 sanitizaciones, 1 diagnóstico, y 10% de descuento en todos los servicios. Prioridad en agenda.',
      type: ServiceType.OTHER,
      category: 'subscription',
      basePrice: 180000,
      estimatedDurationMinutes: 0,
      requiresDeposit: false,
    },
  ];

  for (const service of servicesData) {
    const { requiresDeposit, ...serviceData } = service;
    await prisma.service.upsert({
      where: { name: service.name },
      update: {
        basePrice: serviceData.basePrice,
        minPrice: (serviceData as any).minPrice,
        maxPrice: (serviceData as any).maxPrice,
        estimatedDurationMinutes: serviceData.estimatedDurationMinutes,
      },
      create: serviceData,
    });
  }

  console.log(`Created ${servicesData.length} services`);

  // ==========================================
  // SYMPTOM-SERVICE MAPPINGS
  // ==========================================
  console.log('Creating symptom-service mappings...');

  // Get services for mapping
  const diagnosticService = await prisma.service.findUnique({ where: { name: 'diagnostico' } });
  const sanitizationService = await prisma.service.findUnique({ where: { name: 'sanitizacion-sedan' } });
  const r134aService = await prisma.service.findUnique({ where: { name: 'carga-simple-r134a' } });
  const r1234yfService = await prisma.service.findUnique({ where: { name: 'carga-r1234yf' } });
  const leakRepairService = await prisma.service.findUnique({ where: { name: 'reparacion-fugas' } });
  const compressorService = await prisma.service.findUnique({ where: { name: 'reemplazo-compresor' } });

  const symptomMappings = [
    { symptom: 'no_cooling', services: [diagnosticService!.id] },
    { symptom: 'weak_airflow', services: [diagnosticService!.id, sanitizationService!.id] },
    { symptom: 'bad_smell', services: [sanitizationService!.id] },
    { symptom: 'warm_air', services: [diagnosticService!.id] },
    { symptom: 'noisy_compressor', services: [diagnosticService!.id, compressorService!.id] },
    { symptom: 'leak', services: [leakRepairService!.id, diagnosticService!.id] },
    { symptom: 'icing', services: [diagnosticService!.id] },
    { symptom: 'electrical', services: [diagnosticService!.id] },
    { symptom: 'routine', services: [diagnosticService!.id, r134aService!.id] },
  ];

  for (const mapping of symptomMappings) {
    const symptom = await prisma.symptom.findUnique({ where: { keyword: mapping.symptom } });
    if (symptom) {
      for (const serviceId of mapping.services) {
        // Connect symptom to service (many-to-many)
        await prisma.symptom.update({
          where: { id: symptom.id },
          data: {
            services: {
              connect: { id: serviceId },
            },
          },
        });
      }
    }
  }

  console.log('Created symptom-service mappings');

  // ==========================================
  // ADMIN USER
  // ==========================================
  console.log('Creating admin user...');

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@autofixer.cl' },
    update: {},
    create: {
      email: 'admin@autofixer.cl',
      password: adminPassword,
      firstName: 'Administrador',
      lastName: 'Autofixer',
      phone: '+56912345678',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // ==========================================
  // TECHNICIAN USER
  // ==========================================
  console.log('Creating technician user...');

  const techPassword = await bcrypt.hash('Tecnico123!', 10);

  const techUser = await prisma.user.upsert({
    where: { email: 'tecnico@autofixer.cl' },
    update: {},
    create: {
      email: 'tecnico@autofixer.cl',
      password: techPassword,
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      phone: '+56987654321',
      role: UserRole.TECHNICIAN,
      emailVerified: true,
    },
  });

  // Create technician profile
  const technician = await prisma.technician.upsert({
    where: { userId: techUser.id },
    update: {},
    create: {
      userId: techUser.id,
      employeeCode: 'TECH-001',
      specialty: [ServiceType.DIAGNOSTIC, ServiceType.R134A_REFILL, ServiceType.R1234YF_REFILL, ServiceType.SANITIZATION],
      hourlyRate: 15000,
      experienceYears: 5,
      bio: 'Técnico certificado con amplia experiencia en sistemas de aire acondicionado automotriz.',
      skills: ['R134a', 'R1234yf', 'Diagnóstico electrónico', 'Sanitización'],
      isAvailable: true,
      serviceRadiusKm: 40,
    },
  });

  // Assign technician to all zones
  for (const zone of zones) {
    await prisma.technicianZone.upsert({
      where: {
        technicianId_zoneId: {
          technicianId: technician.id,
          zoneId: zone.id,
        },
      },
      update: { isPrimary: zone.name === 'zona_1' },
      create: {
        technicianId: technician.id,
        zoneId: zone.id,
        isPrimary: zone.name === 'zona_1',
      },
    });
  }

  console.log(`Created technician: ${techUser.email}`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
