import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto, QueryPaymentDto } from './dto/payment.dto';
import { PaymentStatus } from './domain/payment-status';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const payment = this.paymentRepository.create({
      patientId: dto.patientId,
      createdById: userId,
      totalAmount: dto.totalAmount,
      paidAmount: dto.paidAmount,
      status: dto.paidAmount >= dto.totalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
      paymentMethod: dto.paymentMethod,
      isShiftClosed: false,
    });

    return this.paymentRepository.save(payment);
  }

  async findAll(query: QueryPaymentDto) {
    const qb = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.patient', 'patient')
      .leftJoinAndSelect('payment.createdBy', 'createdBy')
      .orderBy('payment.createdAt', 'DESC');

    if (query.patientId) {
      qb.andWhere('payment.patientId = :patientId', { patientId: query.patientId });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async getPendingShiftPayments(userId?: string) {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.patient', 'patient')
      .leftJoinAndSelect('payment.items', 'items')
      .leftJoinAndSelect('items.service', 'service')
      .where('payment.isShiftClosed = :isClosed', { isClosed: false })
      .orderBy('payment.createdAt', 'DESC');

    if (userId) {
      query.andWhere('payment.createdById = :userId', { userId });
    }

    const payments = await query.getMany();
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    return {
      payments,
      count: payments.length,
      totalAmount,
    };
  }

  async closeShift(userId: string, paymentIds?: string[]) {
    const query = this.paymentRepository.createQueryBuilder('payment')
      .where('payment.isShiftClosed = :isClosed', { isClosed: false });

    if (paymentIds && paymentIds.length > 0) {
      query.andWhere('payment.id IN (:...paymentIds)', { paymentIds });
    } else {
      query.andWhere('payment.createdById = :userId', { userId });
    }

    const pendingPayments = await query.getMany();

    if (pendingPayments.length === 0) {
      throw new BadRequestException('Kunni yopish uchun kutilayotgan to'lovlar topilmadi');
    }

    const idsToUpdate = pendingPayments.map((p) => p.id);

    await this.paymentRepository.update(idsToUpdate, {
      isShiftClosed: true,
      shiftClosedAt: new Date(),
      confirmedByUserId: userId,
    });

    return {
      message: 'Kunlik smena va to'lovlar muvaffaqiyatli umumiy hisobotga o'tkazildi',
      closedCount: pendingPayments.length,
      totalAmount: pendingPayments.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0),
    };
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['patient', 'items', 'items.service', 'transactions'],
    });

    if (!payment) {
      throw new NotFoundException('To'lov topilmadi');
    }

    return payment;
  }
}
