import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { QueueTicket } from './entities/queue-ticket.entity';

const PATIENT_FIELDS = ['p.id', 'p.patientCode', 'p.firstName', 'p.lastName', 'p.middleName', 'p.phone', 'p.birthDate', 'p.gender'];
const DOCTOR_USER_FIELDS = ['du.id', 'du.firstName', 'du.lastName', 'du.middleName', 'du.phone', 'du.status', 'du.avatar'];

/** Standard ticket query with patient (limited fields), doctor(+user), department and services. */
export const ticketQuery = (manager: EntityManager): SelectQueryBuilder<QueueTicket> =>
  manager
    .getRepository(QueueTicket)
    .createQueryBuilder('t')
    .leftJoin('t.patient', 'p')
    .addSelect(PATIENT_FIELDS)
    .leftJoinAndSelect('t.doctor', 'doc')
    .leftJoin('doc.user', 'du')
    .addSelect(DOCTOR_USER_FIELDS)
    .leftJoinAndSelect('t.department', 'dep')
    .leftJoinAndSelect('t.ticketServices', 'ts');

export const presentTicket = (ticket: QueueTicket): QueueTicket => {
  ticket.services = (ticket.ticketServices ?? []).map((ts) => ({ id: ts.serviceId, name: ts.serviceName }));
  delete ticket.ticketServices;
  return ticket;
};
