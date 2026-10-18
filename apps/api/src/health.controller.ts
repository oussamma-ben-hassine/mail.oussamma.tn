import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service.js';

@ApiTags('Santé & Disponibilité')
@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Vérification de santé de base' })
  health() {
    return {
      status: 'ok',
      service: 'mail.oussamma.tn-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/health')
  @ApiOperation({ summary: 'Vérification de santé avec base de données' })
  async apiHealth() {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unreachable';
    }

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
