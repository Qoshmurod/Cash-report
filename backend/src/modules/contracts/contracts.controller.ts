import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { ContractsService } from './contracts.service';
import { GuaranteesService } from './guarantees.service';
import {
  AddContractPatientsDto,
  AddDepositDto,
  ContractQueryDto,
  CreateContractDto,
  CreateGuaranteeDto,
  GuaranteeDecisionDto,
  GuaranteeTemplateDto,
  UpdateContractDto,
} from './dto/contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Access(Section.CONTRACTS)
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly guarantees: GuaranteesService,
  ) {}

  // ─── Kafolat xati namunalari ───

  @Get('guarantee-templates')
  @Access(Section.CONTRACT_CREDIT, Section.CONTRACT_CREDIT_APPROVE)
  listTemplates() {
    return this.guarantees.listTemplates();
  }

  @Post('guarantee-templates')
  @Access(Section.CONTRACT_CREDIT_APPROVE)
  createTemplate(@Body() dto: GuaranteeTemplateDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.guarantees.createTemplate(dto, user, meta);
  }

  @Patch('guarantee-templates/:templateId')
  @Access(Section.CONTRACT_CREDIT_APPROVE)
  updateTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: GuaranteeTemplateDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.guarantees.updateTemplate(templateId, dto, user, meta);
  }

  @Get()
  @ApiOperation({ summary: 'Contracts with deposited / spent / balance and low-balance flag' })
  findAll(@Query() query: ContractQueryDto) {
    return this.contracts.findAll(query);
  }

  @Get('low-balance-count')
  @Access(Section.CONTRACTS, Section.REGISTRATION)
  lowBalanceCount() {
    return this.contracts.lowBalanceCount().then((count) => ({ count }));
  }

  @Get('for-patient/:patientId')
  @Access(Section.CONTRACTS, Section.REGISTRATION)
  @ApiOperation({ summary: 'Active contracts this patient may be served under (checkout)' })
  forPatient(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.contracts.forPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contracts.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.contracts.create(dto, user, meta);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.contracts.update(id, dto, user, meta);
  }

  @Post(':id/deposits')
  @ApiOperation({ summary: "Record money transferred under the contract (pul o'tkazildi)" })
  addDeposit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddDepositDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.contracts.addDeposit(id, dto, user, meta);
  }

  @Post(':id/patients')
  @ApiOperation({ summary: 'Add existing or new patients to the contract list' })
  addPatients(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddContractPatientsDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.contracts.addPatients(id, dto, user, meta);
  }

  @Delete(':id/patients/:patientId')
  removePatient(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.contracts.removePatient(id, patientId, user, meta);
  }

  // ─── Kafolat xati → qarzga o'tkazish ───

  @Post(':id/guarantees/preview')
  @Access(Section.CONTRACT_CREDIT)
  @ApiOperation({ summary: 'Compare a guarantee letter with the template (nothing is saved)' })
  previewGuarantee(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateGuaranteeDto) {
    return this.guarantees.preview(id, dto);
  }

  @Post(':id/guarantees')
  @Access(Section.CONTRACT_CREDIT)
  @ApiOperation({ summary: 'Enter a guarantee letter; a template match opens the credit, otherwise it waits for approval' })
  createGuarantee(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateGuaranteeDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.guarantees.create(id, dto, user, meta);
  }

  @Post(':id/guarantees/:gid/approve')
  @Access(Section.CONTRACT_CREDIT_APPROVE)
  approveGuarantee(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('gid', ParseUUIDPipe) gid: string,
    @Body() dto: GuaranteeDecisionDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.guarantees.approve(id, gid, dto.note, user, meta);
  }

  @Post(':id/guarantees/:gid/reject')
  @Access(Section.CONTRACT_CREDIT_APPROVE)
  rejectGuarantee(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('gid', ParseUUIDPipe) gid: string,
    @Body() dto: GuaranteeDecisionDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.guarantees.reject(id, gid, dto.note, user, meta);
  }

  @Post(':id/guarantees/:gid/revoke')
  @Access(Section.CONTRACT_CREDIT_APPROVE)
  revokeGuarantee(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('gid', ParseUUIDPipe) gid: string,
    @Body() dto: GuaranteeDecisionDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.guarantees.revoke(id, gid, dto.note, user, meta);
  }
}
