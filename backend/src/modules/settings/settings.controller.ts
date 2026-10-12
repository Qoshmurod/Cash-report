import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction, Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService, diffObjects } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'All system settings' })
  getAll() {
    return this.settings.getAll();
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public subset (kiosk, queue display, login page)' })
  getPublic() {
    return this.settings.getPublic();
  }

  @Patch()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update settings (admin)' })
  async update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    const { before, after } = await this.settings.update(dto, user.id);
    const diff = diffObjects(before, after);
    if (Object.keys(diff.newValue).length > 0) {
      await this.audit.log({
        userId: user.id,
        action: AuditAction.UPDATE,
        module: AUDIT_MODULES.SETTINGS,
        entity: 'SystemSetting',
        entityId: null,
        ...diff,
        description: `Settings updated: ${Object.keys(diff.newValue).join(', ')}`,
        meta,
      });
    }
    return after;
  }
}
