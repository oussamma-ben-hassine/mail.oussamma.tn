import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SsoAuthGuard } from './guards/sso-auth.guard.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Module({
  providers: [AuthService, SsoAuthGuard, ApiKeyGuard, RolesGuard, PrismaService],
  exports: [AuthService, SsoAuthGuard, ApiKeyGuard, RolesGuard],
})
export class AuthModule {}
