import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { ClinicController } from './clinic.controller';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, ClinicController],
  providers: [PrismaService, AuthGuard],
})
export class AppModule {}
