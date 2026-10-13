import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth.types';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@Access(Section.AUDIT)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Audit log (paginated, filterable)' })
  findAll(@Query() query: AuditQueryDto, @CurrentUser() user: AuthUser) {
    return this.audit.findAll(query, user.login);
  }
}
