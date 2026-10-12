import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, QueryPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/enums';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(userId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  @Get('pending-shift')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async getPendingShiftPayments(@CurrentUser('id') userId: string) {
    return this.paymentsService.getPendingShiftPayments(userId);
  }

  @Post('close-shift')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async closeShift(
    @CurrentUser('id') userId: string,
    @Body('paymentIds') paymentIds?: string[],
  ) {
    return this.paymentsService.closeShift(userId, paymentIds);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.REGISTRAR)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }
}
