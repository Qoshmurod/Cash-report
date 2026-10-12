import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { Roles } from '../../common/decorators/roles.decorator';
import { LoginHistoryQueryDto } from './dto/login-history-query.dto';
import { LoginHistoryService } from './login-history.service';

@ApiTags('Login history')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('login-history')
export class LoginHistoryController {
  constructor(private readonly history: LoginHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'All login attempts (success & failure)' })
  findAll(@Query() query: LoginHistoryQueryDto) {
    return this.history.findAll(query);
  }
}
