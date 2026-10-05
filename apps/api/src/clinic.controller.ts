import { Body, Controller, Get, Param, Patch, Post, Put, Delete, Query, Req, Res, UseGuards, ForbiddenException, NotFoundException, BadRequestException, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import * as argon2 from 'argon2';
import * as XLSX from 'xlsx';
import { FileInterceptor } from '@nestjs/platform-express';

const money = (v: bigint) => Number(v);
const cleanPhone = (v: any) => String(v || '').replace(/\D/g, '');
const dateStart = (v?: string) => v ? new Date(`${v}T00:00:00`) : undefined;
const dateEnd = (v?: string) => v ? new Date(`${v}T23:59:59.999`) : undefined;
const safeJson = (v: any): any => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === 'bigint' ? Number(x) : x));

@Controller()
@UseGuards(AuthGuard)
export class ClinicController {
  constructor(private prisma: PrismaService) {}

  private async user(req: any) {
    return this.prisma.user.findUnique({ where: { id: req.user.sub }, include: { role: { include: { permissions: true } }, departments: true } });
  }
  private async allow(req: any, permission: string) {
    const u = await this.user(req);
    if (!u || !u.isActive) throw new ForbiddenException();
    if (!u.isOwner && !u.role.permissions.some(p => p.permissionId === permission)) throw new ForbiddenException('PERMISSION_DENIED');
    return u;
  }
  private async audit(req: any, action: string, entity: string, entityId?: string, oldValue?: any, newValue?: any) {
    await this.prisma.auditLog.create({ data: { userId: req.user.sub, login: req.user.login, action, entity, entityId, oldValue: oldValue == null ? undefined : safeJson(oldValue), newValue: newValue == null ? undefined : safeJson(newValue), ip: req.ip } });
  }

  @Get('health')
  health() { return { ok: true, service: 'clinika-api', time: new Date().toISOString() }; }

  @Get('me')
  async current(@Req() req: any) {
    const u = await this.user(req);
    if (!u) throw new UnauthorizedException('AUTH_REQUIRED');
    return { user: { id: u.id, name: u.name, login: u.login, role: u.role.name, isOwner: u.isOwner }, permissions: u.role.permissions.map(x => x.permissionId), departments: u.departments.map(x => x.deptKey) };
  }

  @Get('departments')
  async departments(@Req() req: any) {
    await this.allow(req, 'service_access');
    return this.prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  @Post('departments')
  async addDepartment(@Body() b: any, @Req() req: any) {
    await this.allow(req, 'service_add');
    const key = String(b.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!key || !b.name) throw new BadRequestException('INVALID_DEPARTMENT');
    const d = await this.prisma.department.create({ data: { key, name: String(b.name), icon: b.icon || '🧪', isCustom: true } });
    await this.audit(req, 'CREATE', 'Department', d.key, null, d);
    return d;
  }

  @Patch('departments/:key')
  async editDepartment(@Param('key') key: string, @Body() b: any, @Req() req: any) {
    await this.allow(req, 'service_add');
    const old = await this.prisma.department.findUnique({ where: { key } }); if (!old) throw new NotFoundException();
    const d = await this.prisma.department.update({ where: { key }, data: { name: b.name ?? old.name, icon: b.icon ?? old.icon, isActive: b.isActive ?? old.isActive } });
    await this.audit(req, 'UPDATE', 'Department', key, old, d); return d;
  }

  @Get('services')
  async services(@Query('search') search = '', @Query('all') all = '', @Req() req: any) {
    await this.allow(req, 'service_access');
    const rows = await this.prisma.service.findMany({
      where: { ...(all === '1' ? {} : { isActive: true }), ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}) },
      orderBy: { code: 'asc' }
    });
    return rows.map(x => ({ ...x, price: money(x.price), basePrice: money(x.basePrice), antibioticPrice: money(x.antibioticPrice) }));
  }

  @Post('services')
  async addService(@Body() b: any, @Req() req: any) {
    await this.allow(req, 'service_add');
    const code = String(b.code || '').trim().toUpperCase(); if (!code || !b.name || !b.deptKey) throw new BadRequestException('INVALID_SERVICE');
    const price = Math.max(0, Number(b.price || 0));
    const s = await this.prisma.service.create({ data: { code, name: String(b.name), price: BigInt(price), basePrice: BigInt(Number(b.basePrice || price)), antibioticPrice: BigInt(Number(b.antibioticPrice || 0)), deptKey: b.deptKey, isCustom: true } });
    await this.audit(req, 'CREATE', 'Service', s.id, null, s); return { ...s, price, basePrice: Number(s.basePrice), antibioticPrice: Number(s.antibioticPrice) };
  }

  @Put('services/:id')
  async editService(@Param('id') id: string, @Body() b: any, @Req() req: any) {
    await this.allow(req, 'service_add');
    const old = await this.prisma.service.findUnique({ where: { id } }); if (!old) throw new NotFoundException();
    const s = await this.prisma.service.update({ where: { id }, data: { code: b.code ?? old.code, name: b.name ?? old.name, deptKey: b.deptKey ?? old.deptKey, price: b.price !== undefined ? BigInt(Number(b.price)) : old.price, basePrice: b.basePrice !== undefined ? BigInt(Number(b.basePrice)) : old.basePrice, antibioticPrice: b.antibioticPrice !== undefined ? BigInt(Number(b.antibioticPrice)) : old.antibioticPrice, isActive: b.isActive ?? old.isActive } });
    await this.audit(req, 'UPDATE', 'Service', id, old, s); return { ...s, price: money(s.price), basePrice: money(s.basePrice), antibioticPrice: money(s.antibioticPrice) };
  }

  @Delete('services/:id')
  async deleteService(@Param('id') id: string, @Req() req: any) {
    await this.allow(req, 'service_delete');
    const old = await this.prisma.service.findUnique({ where: { id } }); if (!old) throw new NotFoundException();
    const s = await this.prisma.service.update({ where: { id }, data: { isActive: false } }); await this.audit(req, 'DEACTIVATE', 'Service', id, old, s); return { ok: true };
  }

  @Get('patients')
  async patients(@Query('search') search = '', @Req() req: any) {
    await this.allow(req, 'patient_access');
    const rows = await this.prisma.patient.findMany({ where: search ? { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { workplace: { contains: search, mode: 'insensitive' } }] } : {}, include: { contract: true }, orderBy: { createdAt: 'desc' }, take: 300 });
    return rows.map(x => ({ ...x, contract: x.contract ? { ...x.contract, total: money(x.contract.total), paid: money(x.contract.paid), remaining: Math.max(0, money(x.contract.total) - money(x.contract.paid)) } : null }));
  }

  @Post('patients')
  async createPatient(@Body() b: any, @Req() req: any) {
    const u = await this.allow(req, 'patient_add');
    const p = await this.prisma.patient.create({ data: { lastName: String(b.lastName || ''), firstName: String(b.firstName || ''), middleName: b.middleName || null, phone: cleanPhone(b.phone), address: b.address || null, workplace: b.workplace || null, notes: b.notes || null, contractId: b.contractId || null, createdBy: u.id } });
    await this.audit(req, 'CREATE', 'Patient', p.id, null, p); return p;
  }

  @Patch('patients/:id')
  async editPatient(@Param('id') id: string, @Body() b: any, @Req() req: any) {
    await this.allow(req, 'patient_edit'); const old = await this.prisma.patient.findUnique({ where: { id } }); if (!old) throw new NotFoundException();
    const p = await this.prisma.patient.update({ where: { id }, data: { lastName: b.lastName ?? old.lastName, firstName: b.firstName ?? old.firstName, middleName: b.middleName ?? old.middleName, phone: b.phone !== undefined ? cleanPhone(b.phone) : old.phone, address: b.address ?? old.address, workplace: b.workplace ?? old.workplace, notes: b.notes ?? old.notes, contractId: b.contractId ?? old.contractId } });
    await this.audit(req, 'UPDATE', 'Patient', id, old, p); return p;
  }

  @Get('patients/lookup')
  async lookup(@Query('q') q = '', @Req() req: any) {
    await this.allow(req, 'patient_access'); const rows = await this.prisma.patient.findMany({ where: { OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }, include: { contract: true }, take: 15 });
    return rows.map(x => ({ ...x, contract: x.contract ? { ...x.contract, total: money(x.contract.total), paid: money(x.contract.paid), remaining: Math.max(0, money(x.contract.total) - money(x.contract.paid)) } : null }));
  }

  @Post('services/import-excel')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 70 * 1024 * 1024 } }))
  async importServices(@UploadedFile() file: any, @Req() req: any) {
    await this.allow(req, 'service_add');
    if (!file?.buffer) throw new BadRequestException('FILE_REQUIRED');
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let created = 0, updated = 0;
    for (const row of rows) {
      const code = String(row.code || row.Code || row.Kod || row['Код'] || '').trim().toUpperCase();
      const name = String(row.name || row.Name || row.Nomi || row['Nomi'] || '').trim();
      const deptKey = String(row.deptKey || row.Department || row.Bolim || row['Bo‘lim'] || '').trim().toLowerCase();
      const price = Number(row.price || row.Price || row.Narx || row['Narx'] || 0);
      if (!code || !name || !deptKey || !Number.isFinite(price)) continue;
      const dept = await this.prisma.department.findUnique({ where: { key: deptKey } }); if (!dept) continue;
      const exists = await this.prisma.service.findUnique({ where: { code } });
      if (exists) { await this.prisma.service.update({ where:{id:exists.id}, data:{name,deptKey,price:BigInt(Math.max(0,Math.round(price))),isActive:true} }); updated++; }
      else { await this.prisma.service.create({ data:{code,name,deptKey,price:BigInt(Math.max(0,Math.round(price)))} }); created++; }
    }
    await this.audit(req, 'IMPORT', 'Service', undefined, null, { created, updated, rows: rows.length });
    return { created, updated, totalRows: rows.length };
  }

  @Get('contracts')
  async contracts(@Query('search') search = '', @Req() req: any) {
    await this.allow(req, 'patient_access');
    const rows = await this.prisma.contract.findMany({ where: search ? { contractNo: { contains: search, mode: 'insensitive' } } : {}, include: { patients: true }, orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map(c => ({ ...c, total: money(c.total), paid: money(c.paid), remaining: Math.max(0, money(c.total)-money(c.paid)), alert10: money(c.total) > 0 && money(c.total)-money(c.paid) <= money(c.total)*0.1 }));
  }

  @Post('contracts')
  async createContract(@Body() b: any, @Req() req: any) {
    await this.allow(req, 'patient_add'); const total = Number(b.total || 0); if (!b.contractNo || total <= 0) throw new BadRequestException('INVALID_CONTRACT');
    const c = await this.prisma.contract.create({ data: { contractNo: String(b.contractNo), total: BigInt(total), paid: BigInt(Number(b.paid || 0)), patients: b.patientId ? { connect: { id: b.patientId } } : undefined } });
    await this.audit(req, 'CREATE', 'Contract', c.id, null, c); return { ...c, total, paid: Number(c.paid), remaining: total-Number(c.paid) };
  }

  @Patch('contracts/:id')
  async editContract(@Param('id') id: string, @Body() b: any, @Req() req: any) {
    await this.allow(req, 'patient_edit'); const old = await this.prisma.contract.findUnique({ where: { id } }); if (!old) throw new NotFoundException();
    const c = await this.prisma.contract.update({ where: { id }, data: { total: b.total !== undefined ? BigInt(Number(b.total)) : old.total, paid: b.paid !== undefined ? BigInt(Number(b.paid)) : old.paid } }); await this.audit(req,'UPDATE','Contract',id,old,c);
    return { ...c, total: money(c.total), paid: money(c.paid), remaining: money(c.total)-money(c.paid) };
  }

  @Get('orders/pending')
  async pending(@Req() req: any) { await this.allow(req, 'cashier_access'); const rows = await this.prisma.order.findMany({ where: { status: 'pending' }, include: { items: true }, orderBy: { createdAt: 'asc' } }); return rows.map(x => ({ ...x, total: money(x.total), items: x.items.map(i => ({ ...i, price: money(i.price) })) })); }

  @Post('orders')
  async createOrder(@Body() b: any, @Req() req: any) {
    const u = await this.allow(req, 'kassa_edit'); if (!Array.isArray(b.items) || !b.items.length) throw new BadRequestException('EMPTY_CART');
    const patientId = b.patientId || (await this.prisma.patient.create({ data: { firstName: b.firstName || '', lastName: b.lastName || '', middleName: b.middleName || null, phone: cleanPhone(b.phone), address: b.address || null, workplace: b.workplace || null, autoCreated: true, createdBy: u.id } })).id;
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId }, include: { contract: true } }); if (!patient) throw new NotFoundException('PATIENT_NOT_FOUND');
    const codes = b.items.map((x: any) => String(x.code)); const services = await this.prisma.service.findMany({ where: { code: { in: codes }, isActive: true } }); const byCode = new Map(services.map(s => [s.code, s]));
    let total = 0; const items: any[] = [];
    for (const it of b.items) { const s = byCode.get(it.code); if (!s) throw new NotFoundException(`SERVICE_NOT_FOUND:${it.code}`); const qty = Math.max(1, Number(it.qty || 1)); const price = Number(s.price); total += price*qty; items.push({ serviceId:s.id, code:s.code, name:s.name, deptKey:s.deptKey, price:BigInt(price), qty, variant:it.variant || 'std' }); }
    const paymentType = b.type === 'contract' ? 'contract' : b.type === 'pending' ? 'pending' : 'card';
    if (paymentType === 'contract') { if (!patient.contractId || !patient.contract) throw new ForbiddenException('CONTRACT_REQUIRED'); const remaining = Number(patient.contract.total - patient.contract.paid); if (total > remaining) throw new ForbiddenException('CONTRACT_BALANCE_TOO_LOW'); }
    const order = await this.prisma.$transaction(async tx => {
      const o = await tx.order.create({ data: { patientId: patient.id, contractId: patient.contractId, patientFullName:`${patient.lastName} ${patient.firstName}`.trim(), firstName:patient.firstName,lastName:patient.lastName,middleName:patient.middleName,phone:patient.phone,address:patient.address,workplace:patient.workplace,note:b.note||null,total:BigInt(total),paymentType:paymentType as any,status:paymentType==='pending'?'pending':'completed',cashierId:u.id,verifiedAt:paymentType==='pending'?null:new Date(),items:{create:items} }, include:{items:true} });
      if (paymentType === 'contract' && patient.contractId) await tx.contract.update({ where:{id:patient.contractId}, data:{paid:{increment:BigInt(total)}} });
      return o;
    });
    await this.audit(req,'CREATE','Order',order.id,null,{...order,total});
    const contractWarning = patient.contract ? (Number(patient.contract.total) - Number(patient.contract.paid) - total) <= Number(patient.contract.total)*0.1 : false;
    return { ...order, total, items: order.items.map(i => ({ ...i, price: money(i.price) })), contractWarning };
  }

  @Post('orders/close-day')
  async closeDay(@Body() b: { orderIds: string[] }, @Req() req: any) { const u = await this.allow(req, 'cashier_close'); const ids = b.orderIds || []; const result = await this.prisma.order.updateMany({ where:{id:{in:ids},status:'pending'}, data:{status:'completed',paymentType:'card',verifiedAt:new Date(),verifiedBy:u.id} }); await this.audit(req,'CLOSE_DAY','Order',undefined,null,{ids,updated:result.count}); return {updated:result.count}; }

  @Get('provision/orders')
  async provision(@Req() req: any) { const u=await this.allow(req,'service_provision_access'); const scope=u.isOwner||u.departments.some(d=>d.deptKey==='ALL')?undefined:u.departments.map(d=>d.deptKey); const rows=await this.prisma.order.findMany({where:{status:'completed',items:{some:{serviceStatus:{not:'completed'},...(scope?{deptKey:{in:scope}}:{})}}},include:{items:true},orderBy:{createdAt:'desc'},take:300}); return rows.map(o=>({...o,total:money(o.total),items:o.items.filter(i=>!scope||scope.includes(i.deptKey)).map(i=>({...i,price:money(i.price)}))})); }

  @Patch('provision/items/:id/complete')
  async complete(@Param('id') id:string,@Req() req:any){const u=await this.allow(req,'service_provision_complete');const item=await this.prisma.orderItem.findUnique({where:{id}});if(!item)throw new NotFoundException();if(!u.isOwner&&!u.departments.some(d=>d.deptKey===item.deptKey||d.deptKey==='ALL'))throw new ForbiddenException('DEPARTMENT_DENIED');await this.prisma.orderItem.update({where:{id},data:{serviceStatus:'completed',completedAt:new Date(),completedBy:u.id}});const pending=await this.prisma.orderItem.count({where:{orderId:item.orderId,serviceStatus:{not:'completed'}}});await this.prisma.order.update({where:{id:item.orderId},data:{serviceStatus:pending?'partial':'completed'}});return{ok:true};}

  @Get('reports/summary')
  async summary(@Query('from') from:string,@Query('to') to:string,@Req() req:any){await this.allow(req,'report_view');const where:any={status:'completed',createdAt:{}};if(from)where.createdAt.gte=dateStart(from);if(to)where.createdAt.lte=dateEnd(to);if(!from&&!to)delete where.createdAt;const [orders,patients,revenue]=await Promise.all([this.prisma.order.count({where}),this.prisma.patient.count(),this.prisma.order.aggregate({where,_sum:{total:true}})]);const byPayment=await this.prisma.order.groupBy({by:['paymentType'],where,_sum:{total:true},_count:{_all:true}});return{orders,patients,revenue:money(revenue._sum.total||BigInt(0)),byPayment:byPayment.map(x=>({paymentType:x.paymentType,total:money(x._sum.total||BigInt(0)),count:x._count._all}))};}

  @Get('reports/detailed')
  async detailed(@Query('from') from:string,@Query('to') to:string,@Query('paymentType') paymentType:string,@Req() req:any){await this.allow(req,'report_view');const where:any={status:'completed'};if(from||to)where.createdAt={...(from?{gte:dateStart(from)}:{}),...(to?{lte:dateEnd(to)}:{})};if(paymentType)where.paymentType=paymentType;const rows=await this.prisma.order.findMany({where,include:{items:true},orderBy:{createdAt:'desc'},take:5000});return rows.map(o=>({id:o.id,displayId:o.displayId,client:o.patientFullName,total:money(o.total),paymentType:o.paymentType,status:o.status,createdAt:o.createdAt,items:o.items.map(i=>({name:i.name,deptKey:i.deptKey,qty:i.qty,price:money(i.price),serviceStatus:i.serviceStatus}))}));}

  @Get('reports/export')
  async exportReport(@Query('from') from:string,@Query('to') to:string,@Req() req:any,@Res() res:any){await this.allow(req,'report_download');const rows=await this.detailed(from,to,'',req);const data=rows.map(r=>({ID:r.displayId,Mijoz:r.client,Summa:r.total,To_lov:r.paymentType,Sana:new Date(r.createdAt).toLocaleString('uz-UZ'),Xizmatlar:r.items.map(i=>`${i.name} x${i.qty}`).join('; ')}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'Hisobot');const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="clinika-hisobot-${from||'all'}-${to||'all'}.xlsx"`);res.send(buf);}

  @Get('admin/roles')
  async roles(@Req() req:any){await this.allow(req,'user_access');return this.prisma.role.findMany({include:{permissions:true},orderBy:{name:'asc'}});}
  @Get('admin/users')
  async users(@Req() req:any){await this.allow(req,'user_access');const rows=await this.prisma.user.findMany({include:{role:true,departments:true},orderBy:{name:'asc'}});return rows.map(u=>({...u,passwordHash:undefined}));}
  @Post('admin/users')
  async addUser(@Body() b:any,@Req() req:any){await this.allow(req,'user_add');const role=await this.prisma.role.findUnique({where:{id:b.roleId}});if(!role)throw new NotFoundException('ROLE_NOT_FOUND');const u=await this.prisma.user.create({data:{name:String(b.name),login:String(b.login).trim().toLowerCase(),passwordHash:await argon2.hash(String(b.password||'ChangeMe123!')),roleId:role.id,isOwner:false,departments:{create:(b.departments||[]).map((deptKey:string)=>({deptKey}))}},include:{role:true,departments:true}});await this.audit(req,'CREATE','User',u.id,null,u);return{...u,passwordHash:undefined};}
  @Patch('admin/users/:id')
  async editUser(@Param('id') id:string,@Body() b:any,@Req() req:any){await this.allow(req,'user_edit');const old=await this.prisma.user.findUnique({where:{id},include:{departments:true}});if(!old)throw new NotFoundException();const data:any={name:b.name??old.name,roleId:b.roleId??old.roleId,isActive:b.isActive??old.isActive};if(b.password)data.passwordHash=await argon2.hash(String(b.password));const u=await this.prisma.user.update({where:{id},data,include:{role:true,departments:true}});if(Array.isArray(b.departments)){await this.prisma.userDepartment.deleteMany({where:{userId:id}});if(b.departments.length)await this.prisma.userDepartment.createMany({data:b.departments.map((deptKey:string)=>({userId:id,deptKey}))});}await this.audit(req,'UPDATE','User',id,old,u);return{...u,passwordHash:undefined};}
  @Delete('admin/users/:id')
  async deleteUser(@Param('id') id:string,@Req() req:any){await this.allow(req,'user_delete');if(id===req.user.sub)throw new ForbiddenException('SELF_DELETE');const old=await this.prisma.user.findUnique({where:{id}});if(!old)throw new NotFoundException();const u=await this.prisma.user.update({where:{id},data:{isActive:false}});await this.audit(req,'DEACTIVATE','User',id,old,u);return{ok:true};}

  @Get('audit')
  async auditLogs(@Query('limit') limit='100',@Req() req:any){await this.allow(req,'audit_access');return this.prisma.auditLog.findMany({orderBy:{createdAt:'desc'},take:Math.min(500,Math.max(1,Number(limit)||100))});}
}

