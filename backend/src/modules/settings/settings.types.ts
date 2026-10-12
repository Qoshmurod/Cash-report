export interface WorkingHours {
  start: string;
  end: string;
}

export interface SystemSettings {
  hospitalName: string;
  phone: string;
  address: string;
  logo: string | null;
  receiptHeader: string;
  receiptFooter: string;
  currency: string;
  timezone: string;
  workingHours: WorkingHours;
  voiceAnnouncements: boolean;
  announcementLanguage: 'uz' | 'ru';
}

export type PublicSettings = Pick<
  SystemSettings,
  'hospitalName' | 'logo' | 'phone' | 'address' | 'currency' | 'timezone' | 'voiceAnnouncements' | 'announcementLanguage'
>;

export const DEFAULT_SETTINGS: SystemSettings = {
  hospitalName: 'Shifo Med Markazi',
  phone: '+998 71 200 00 00',
  address: "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi 1",
  logo: null,
  receiptHeader: 'Shifo Med — sog‘lig‘ingiz biz uchun muhim',
  receiptFooter: 'Xaridingiz uchun rahmat! Sog‘ bo‘ling!',
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
  workingHours: { start: '08:00', end: '18:00' },
  voiceAnnouncements: true,
  announcementLanguage: 'uz',
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SystemSettings)[];
