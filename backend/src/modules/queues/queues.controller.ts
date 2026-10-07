import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { BoardQueryDto, CancelTicketDto, CompleteTicketDto, MyQueueQueryDto, QueueQueryDto, TransferTicketDto } from './dto/queue.dto';
import { QueuesService } from './queues.service';

@ApiTags('Queues')
@ApiBearerAuth()
@Controller('queues')
export class QueuesController {
  constructor(private readonly queues: QueuesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  findAll(@Query() query: QueueQueryDto) {
    return this.queues.findAll(query);
  }

  @Get('my')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: "Doctor's queue for the day" })
  my(@CurrentUser() user: AuthUser, @Query() query: MyQueueQueryDto) {
    return this.queues.my(user, query.date);
  }

  @Public()
  @Get('board')
  @ApiOperation({ summary: 'Public queue display data (no personal information)' })
  board(@Query() query: BoardQueryDto) {
    return this.queues.board(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.DOCTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.queues.findOne(id, user);
  }

  @Post(':id/call')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: '"Bemorni chaqirish" — shows ticket + room on the display and announces it' })
  call(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.queues.call(id, user, meta);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DOCTOR, Role.ADMIN)
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.queues.start(id, user, meta);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DOCTOR, Role.ADMIN)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteTicketDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.queues.complete(id, user, meta, dto);
  }

  @Post(':id/skip')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DOCTOR, Role.ADMIN)
  skip(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.queues.skip(id, user, meta);
  }

  @Post(':id/requeue')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DOCTOR, Role.ADMIN, Role.REGISTRAR)
  requeue(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.queues.requeue(id, user, meta);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.REGISTRAR)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTicketDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.queues.cancel(id, user, meta, dto.reason);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.REGISTRAR)
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferTicketDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.queues.transfer(id, user, meta, dto.doctorId);
  }
}
