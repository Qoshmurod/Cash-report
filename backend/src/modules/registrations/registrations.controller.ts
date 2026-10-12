import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { CheckoutDto } from './dto/checkout.dto';
import { RegistrationsService } from './registrations.service';

@ApiTags('Registrations (checkout)')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.REGISTRAR)
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Patient + payment + queue tickets in one transaction (idempotent by idempotencyKey)',
  })
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.registrations.checkout(dto, user, meta);
  }
}
