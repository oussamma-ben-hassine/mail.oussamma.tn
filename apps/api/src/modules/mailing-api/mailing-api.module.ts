import { Module } from '@nestjs/common';
import { MailingApiController } from './mailing-api.controller.js';
import { MailingApiService } from './mailing-api.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [MailingApiController],
  providers: [MailingApiService, PrismaService],
  exports: [MailingApiService],
})
export class MailingApiModule {}
