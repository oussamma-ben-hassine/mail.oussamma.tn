import { Module } from '@nestjs/common';
import { DriveController } from './drive.controller.js';
import { DriveService } from './drive.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [DriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
