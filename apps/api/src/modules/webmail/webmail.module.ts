import { Module } from '@nestjs/common';
import { WebmailController } from './webmail.controller.js';
import { WebmailService } from './webmail.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [WebmailController],
  providers: [WebmailService, PrismaService],
  exports: [WebmailService],
})
export class WebmailModule {}
