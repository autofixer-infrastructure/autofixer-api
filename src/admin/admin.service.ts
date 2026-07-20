import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalClients,
      totalTechnicians,
      totalBookings,
      pendingBookings,
      completedBookings,
      totalRevenue,
      recentBookings,
      topTechnicians,
    ] = await Promise.all([
      // User counts
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'CLIENT', isActive: true } }),
      this.prisma.user.count({ where: { role: 'TECHNICIAN' } }),
      
      // Booking counts
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      
      // Revenue (from completed bookings with payments)
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      
      // Recent bookings
      this.prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { firstName: true, lastName: true, email: true },
          },
          vehicle: {
            select: { plate: true, brand: true, model: true },
          },
        },
      }),
      
      // Top technicians by jobs
      this.prisma.technician.findMany({
        take: 5,
        orderBy: { totalJobs: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        clients: totalClients,
        technicians: totalTechnicians,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        completed: completedBookings,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        transactions: totalRevenue._count || 0,
      },
      recentBookings,
      topTechnicians: topTechnicians.map((t) => ({
        id: t.id,
        name: `${t.user.firstName} ${t.user.lastName}`,
        totalJobs: t.totalJobs,
        rating: t.rating,
      })),
    };
  }

  /**
   * Get technician performance report
   */
  async getTechnicianReport(technicianId?: string) {
    const where = technicianId ? { id: technicianId } : {};

    const technicians = await this.prisma.technician.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookings: {
          where: {
            status: BookingStatus.COMPLETED,
          },
          select: {
            id: true,
            total: true,
            serviceEndTime: true,
            scheduledDate: true,
          },
        },
        reviews: {
          select: {
            overallRating: true,
            punctuality: true,
            professionalism: true,
            workQuality: true,
            communication: true,
          },
        },
      },
    });

    return technicians.map((tech) => {
      const totalJobs = tech.bookings.length;
      const totalEarnings = tech.bookings.reduce((sum, b) => sum + Number(b.total), 0);
      
      const avgRating = tech.reviews.length > 0
        ? tech.reviews.reduce((sum, r) => sum + r.overallRating, 0) / tech.reviews.length
        : 0;

      return {
        id: tech.id,
        name: `${tech.user.firstName} ${tech.user.lastName}`,
        email: tech.user.email,
        employeeCode: tech.employeeCode,
        totalJobs,
        totalEarnings,
        averageRating: Math.round(avgRating * 100) / 100,
        isAvailable: tech.isAvailable,
        bookings: tech.bookings.slice(0, 10), // Last 10 bookings
      };
    });
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(params: {
    fromDate?: Date;
    toDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const { fromDate, toDate, groupBy = 'day' } = params;

    const where: any = {
      status: BookingStatus.COMPLETED,
    };
    
    if (fromDate || toDate) {
      where.serviceEndTime = {};
      if (fromDate) where.serviceEndTime.gte = fromDate;
      if (toDate) where.serviceEndTime.lte = toDate;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        total: true,
        laborCost: true,
        partsCost: true,
        materialsCost: true,
        travelCost: true,
        serviceEndTime: true,
        technicianId: true,
      },
    });

    // Group by date
    const grouped = bookings.reduce((acc, booking) => {
      const date = booking.serviceEndTime
        ? new Date(booking.serviceEndTime).toISOString().split('T')[0]
        : 'unknown';
      
      if (!acc[date]) {
        acc[date] = {
          date,
          totalRevenue: 0,
          totalBookings: 0,
          laborRevenue: 0,
          partsRevenue: 0,
          materialsRevenue: 0,
          travelRevenue: 0,
        };
      }
      
      acc[date].totalRevenue += Number(booking.total);
      acc[date].totalBookings += 1;
      acc[date].laborRevenue += Number(booking.laborCost);
      acc[date].partsRevenue += Number(booking.partsCost);
      acc[date].materialsRevenue += Number(booking.materialsCost);
      acc[date].travelRevenue += Number(booking.travelCost);
      
      return acc;
    }, {} as Record<string, any>);

    const totals = Object.values(grouped);
    const grandTotal = totals.reduce(
      (acc, item) => ({
        totalRevenue: acc.totalRevenue + item.totalRevenue,
        totalBookings: acc.totalBookings + item.totalBookings,
      }),
      { totalRevenue: 0, totalBookings: 0 },
    );

    return {
      summary: grandTotal,
      breakdown: totals.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Manage zones
   */
  async getZones() {
    return this.prisma.zone.findMany({
      include: {
        communes: true,
        _count: {
          select: { technicians: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createZone(data: { name: string; displayName: string; color?: string }) {
    return this.prisma.zone.create({
      data: {
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: data.displayName,
        color: data.color || '#3B82F6',
      },
    });
  }

  async updateZone(id: string, data: { displayName?: string; color?: string; isActive?: boolean }) {
    return this.prisma.zone.update({
      where: { id },
      data,
    });
  }

  /**
   * Assign technician to zone
   */
  async assignTechnicianToZone(technicianId: string, zoneId: string, isPrimary: boolean = false) {
    return this.prisma.technicianZone.upsert({
      where: {
        technicianId_zoneId: { technicianId, zoneId },
      },
      update: { isPrimary },
      create: { technicianId, zoneId, isPrimary },
    });
  }

  async removeTechnicianFromZone(technicianId: string, zoneId: string) {
    return this.prisma.technicianZone.delete({
      where: {
        technicianId_zoneId: { technicianId, zoneId },
      },
    });
  }

  /**
   * Get communes
   */
  async getCommunes() {
    return this.prisma.commune.findMany({
      include: {
        zone: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCommune(data: { name: string; region: string; zoneId?: string; basePrice?: number; travelFee?: number }) {
    return this.prisma.commune.create({
      data: {
        name,
        region,
        zoneId: data.zoneId,
        basePrice: data.basePrice || 0,
        travelFee: data.travelFee || 0,
      },
    });
  }

  /**
   * System health check
   */
  async getSystemHealth() {
    const [
      dbConnectionStatus,
      pendingJobs,
      activeSessions,
    ] = await Promise.all([
      // Check database connection
      this.prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'error'),
      
      // Pending bookings count
      this.prisma.booking.count({
        where: { status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
      }),
      
      // Active sessions (last 24 hours)
      this.prisma.session.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      status: dbConnectionStatus === 'ok' ? 'healthy' : 'unhealthy',
      database: dbConnectionStatus,
      pendingJobs,
      activeSessions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export data for backup
   */
  async exportData() {
    const [users, bookings, technicians, services] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.booking.findMany({
        include: {
          client: { select: { email: true } },
          vehicle: true,
          services: { include: { service: true } },
        },
      }),
      this.prisma.technician.findMany({
        include: { user: true },
      }),
      this.prisma.service.findMany(),
    ]);

    return {
      exportDate: new Date().toISOString(),
      data: {
        users,
        bookings,
        technicians,
        services,
      },
    };
  }
}
