import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth.types';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { Roles } from '../../common/decorators/roles.decorator';
import { LoginHistoryQueryDto } from './dto/login-history-query.dto';
import { LoginHistoryService } from './login-history.service';

@ApiTags('Login history')
@ApiBearerAuth()
@Access(Section.LOGIN_HISTORY)
@Controller('login-history')
export class LoginHistoryController {
  constructor(private readonly history: LoginHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'All login attempts (success & failure)' })
  findAll(@Query() query: LoginHistoryQueryDto, @CurrentUser() user: AuthUser) {
    return this.history.findAll(query, undefined, user.login);
  }
}
