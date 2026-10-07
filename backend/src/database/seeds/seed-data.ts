import { Gender, Role } from '../../common/constants/enums';
import { WorkSchedule } from '../../modules/doctors/entities/doctor.entity';

export interface SeedDepartment {
  code: string;
  name: string;
  nameRu: string;
  queuePrefix: string;
  sortOrder: number;
  description: string;
  services: { code: string; name: string; nameRu: string; price: number; durationMinutes: number; description?: string }[];
}

export const SEED_DEPARTMENTS: SeedDepartment[] = [
  {
    code: 'CARD',
    name: 'Kardiologiya',
    nameRu: 'Кардиология',
    queuePrefix: 'A',
    sortOrder: 1,
    description: 'Yurak-qon tomir kasalliklari diagnostikasi va davolash',
    services: [
      { code: 'CARD-001', name: "Kardiolog ko'rigi", nameRu: 'Приём кардиолога', price: 150000, durationMinutes: 20 },
      { code: 'CARD-002', name: 'EKG', nameRu: 'ЭКГ', price: 80000, durationMinutes: 15 },
      { code: 'CARD-003', name: 'ECHO (Exokardiografiya)', nameRu: 'ЭхоКГ', price: 250000, durationMinutes: 30 },
      { code: 'CARD-004', name: 'Holter monitoring', nameRu: 'Холтер-мониторинг', price: 300000, durationMinutes: 20 },
    ],
  },
  {
    code: 'LAB',
    name: 'Laboratoriya',
    nameRu: 'Лаборатория',
    queuePrefix: 'L',
    sortOrder: 2,
    description: 'Klinik va biokimyoviy tahlillar',
    services: [
      { code: 'LAB-001', name: 'Umumiy qon tahlili', nameRu: 'Общий анализ крови', price: 45000, durationMinutes: 10 },
      { code: 'LAB-002', name: 'Siydik tahlili', nameRu: 'Общий анализ мочи', price: 35000, durationMinutes: 10 },
      { code: 'LAB-003', name: 'Biokimyoviy analiz', nameRu: 'Биохимический анализ', price: 120000, durationMinutes: 10 },
      { code: 'LAB-004', name: 'Qandli diabet (glyukoza, HbA1c)', nameRu: 'Глюкоза, HbA1c', price: 70000, durationMinutes: 10 },
    ],
  },
  {
    code: 'UZI',
    name: 'UZI',
    nameRu: 'УЗИ',
    queuePrefix: 'U',
    sortOrder: 3,
    description: 'Ultratovush diagnostikasi',
    services: [
      { code: 'UZI-001', name: "Qorin bo'shlig'i UZI", nameRu: 'УЗИ брюшной полости', price: 180000, durationMinutes: 20 },
      { code: 'UZI-002', name: 'Yurak UZI', nameRu: 'УЗИ сердца', price: 220000, durationMinutes: 25 },
      { code: 'UZI-003', name: 'Qalqonsimon bez UZI', nameRu: 'УЗИ щитовидной железы', price: 120000, durationMinutes: 15 },
      { code: 'UZI-004', name: 'Buyrak UZI', nameRu: 'УЗИ почек', price: 130000, durationMinutes: 15 },
    ],
  },
  {
    code: 'TER',
    name: 'Terapiya',
    nameRu: 'Терапия',
    queuePrefix: 'T',
    sortOrder: 4,
    description: 'Umumiy amaliyot shifokori qabuli',
    services: [
      { code: 'TER-001', name: "Terapevt ko'rigi", nameRu: 'Приём терапевта', price: 100000, durationMinutes: 20 },
      { code: 'TER-002', name: "Takroriy ko'rik", nameRu: 'Повторный приём', price: 60000, durationMinutes: 15 },
      { code: 'TER-003', name: "Qon bosimini o'lchash", nameRu: 'Измерение давления', price: 20000, durationMinutes: 5 },
    ],
  },
  {
    code: 'NEV',
    name: 'Nevrologiya',
    nameRu: 'Неврология',
    queuePrefix: 'N',
    sortOrder: 5,
    description: 'Asab tizimi kasalliklari',
    services: [
      { code: 'NEV-001', name: "Nevrolog ko'rigi", nameRu: 'Приём невролога', price: 160000, durationMinutes: 25 },
      { code: 'NEV-002', name: 'EEG', nameRu: 'ЭЭГ', price: 200000, durationMinutes: 30 },
      { code: 'NEV-003', name: 'Nevrologik maslahat', nameRu: 'Консультация невролога', price: 90000, durationMinutes: 15 },
    ],
  },
];

const WEEKDAY_SCHEDULE: WorkSchedule = {
  '1': { start: '08:00', end: '17:00' },
  '2': { start: '08:00', end: '17:00' },
  '3': { start: '08:00', end: '17:00' },
  '4': { start: '08:00', end: '17:00' },
  '5': { start: '08:00', end: '17:00' },
  '6': { start: '09:00', end: '14:00' },
  '7': null,
};

export interface SeedUser {
  login: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  phone: string;
  email?: string;
  profession?: string;
  birthDate?: string;
  doctor?: { specialty: string; roomNumber: string; serviceCodes: string[]; workSchedule: WorkSchedule };
}

/** Doctors & registrar — password = login (development only; forced change in production). */
export const SEED_STAFF: SeedUser[] = [
  {
    login: 'registrar01', password: 'registrar01', role: Role.REGISTRAR, firstName: 'Nilufar', lastName: 'Qodirova', middleName: 'Baxtiyorovna',
    gender: Gender.FEMALE, phone: '+998901110101', email: 'registrar01@shifo.uz', profession: 'Registrator', birthDate: '1995-03-12',
  },
  {
    login: 'doctor01', password: 'doctor01', role: Role.DOCTOR, firstName: 'Anvar', lastName: 'Aliyev', middleName: 'Karimovich',
    gender: Gender.MALE, phone: '+998901110201', email: 'aliyev@shifo.uz', profession: 'Shifokor', birthDate: '1978-06-02',
    doctor: { specialty: 'Kardiolog', roomNumber: '204', serviceCodes: ['CARD-001', 'CARD-002', 'CARD-003', 'CARD-004', 'UZI-002'], workSchedule: WEEKDAY_SCHEDULE },
  },
  {
    login: 'doctor02', password: 'doctor02', role: Role.DOCTOR, firstName: 'Dilnoza', lastName: 'Karimova', middleName: 'Rustamovna',
    gender: Gender.FEMALE, phone: '+998901110202', email: 'karimova@shifo.uz', profession: 'Shifokor', birthDate: '1985-11-20',
    doctor: { specialty: 'Terapevt', roomNumber: '105', serviceCodes: ['TER-001', 'TER-002', 'TER-003', 'CARD-002'], workSchedule: WEEKDAY_SCHEDULE },
  },
  {
    login: 'doctor03', password: 'doctor03', role: Role.DOCTOR, firstName: 'Jasur', lastName: 'Sobirov', middleName: 'Anvarovich',
    gender: Gender.MALE, phone: '+998901110203', email: 'sobirov@shifo.uz', profession: 'Shifokor', birthDate: '1982-01-15',
    doctor: { specialty: 'Nevrolog', roomNumber: '310', serviceCodes: ['NEV-001', 'NEV-002', 'NEV-003'], workSchedule: WEEKDAY_SCHEDULE },
  },
  {
    login: 'doctor04', password: 'doctor04', role: Role.DOCTOR, firstName: 'Malika', lastName: 'Yusupova', middleName: 'Shavkatovna',
    gender: Gender.FEMALE, phone: '+998901110204', email: 'yusupova@shifo.uz', profession: 'Laborant-shifokor', birthDate: '1990-08-08',
    doctor: { specialty: 'Laborant', roomNumber: '101', serviceCodes: ['LAB-001', 'LAB-002', 'LAB-003', 'LAB-004'], workSchedule: WEEKDAY_SCHEDULE },
  },
  {
    login: 'doctor05', password: 'doctor05', role: Role.DOCTOR, firstName: 'Otabek', lastName: 'Rahimov', middleName: 'Erkinovich',
    gender: Gender.MALE, phone: '+998901110205', email: 'rahimov@shifo.uz', profession: 'Shifokor', birthDate: '1987-04-27',
    doctor: { specialty: 'UZI mutaxassisi', roomNumber: '112', serviceCodes: ['UZI-001', 'UZI-002', 'UZI-003', 'UZI-004'], workSchedule: WEEKDAY_SCHEDULE },
  },
];

export const DEMO_FIRST_NAMES_MALE = ['Ali', 'Vali', 'Anvar', 'Sardor', 'Bekzod', 'Jahongir', 'Otabek', 'Shoxrux', 'Doniyor', 'Rustam', 'Aziz', 'Farrux', 'Sanjar', 'Ulugbek', 'Temur'];
export const DEMO_FIRST_NAMES_FEMALE = ['Madina', 'Dilnoza', 'Gulnora', 'Nigora', 'Sevara', 'Zarina', 'Malika', 'Shahnoza', 'Kamola', 'Feruza', 'Nodira', 'Munisa', 'Laylo', 'Mohira'];
export const DEMO_LAST_NAMES = ['Aliyev', 'Karimov', 'Sobirov', 'Rahimov', 'Yusupov', 'Tursunov', 'Ergashev', 'Qodirov', 'Nazarov', 'Xolmatov', 'Abdullayev', "Mo'minov", 'Saidov', 'Umarov', 'Rasulov'];
export const DEMO_ADDRESSES = ['Toshkent, Chilonzor', 'Toshkent, Yunusobod', 'Toshkent, Mirzo Ulugbek', 'Toshkent, Sergeli', 'Toshkent, Yakkasaroy', 'Toshkent viloyati, Chirchiq'];
export const DEMO_CONTRACTS = [
  { contractNumber: 'SH-2026/014', organization: '"Uzbekiston Temir Yo‘llari" AJ' },
  { contractNumber: 'SH-2026/027', organization: '"Gross Sug‘urta" MChJ' },
  { contractNumber: 'SH-2026/031', organization: '"Artel Electronics" MChJ' },
];
