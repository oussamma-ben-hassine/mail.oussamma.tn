import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma/prisma.service.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MailingApiModule } from './modules/mailing-api/mailing-api.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { WebmailModule } from './modules/webmail/webmail.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { DriveModule } from './modules/drive/drive.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    AuthModule,
    MailingApiModule,
    TemplatesModule,
    ApplicationsModule,
    WebmailModule,
    AiModule,
    DriveModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
