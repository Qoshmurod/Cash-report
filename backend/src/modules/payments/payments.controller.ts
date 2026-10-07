import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { AddPaymentDto, CancelPaymentDto, PaymentQueryDto, RefundDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.REGISTRAR)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  findAll(@Query() query: PaymentQueryDto) {
    return this.payments.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top up a partially paid / unpaid payment' })
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPaymentDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.payments.addPayment(id, dto, user, meta);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Refund (full by default). Full refund cancels waiting tickets' })
  refund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.payments.refund(id, dto.amount, dto.reason, user, meta);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a payment with no money received; cancels its open tickets' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPaymentDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.payments.cancel(id, dto.reason, user, meta);
  }

  @Get(':id/receipt')
  receipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.receipt(id);
  }

  @Get(':id/receipt/pdf')
  @ApiProduces('application/pdf')
  async receiptPdf(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const { buffer, filename } = await this.payments.receiptPdf(id);
    return new StreamableFile(buffer, { type: 'application/pdf', disposition: `inline; filename="${filename}"`, length: buffer.length });
  }
}
