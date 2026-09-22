type Language = 'uz' | 'en' | 'ru'

const messages: Record<Language, Record<string, string>> = {
  uz: {
    clinic: 'Klinika Kassasi', cash: 'Kassa', patients: 'Bemorlar', logout: 'Chiqish',
    loginTitle: 'Hisobingizga kiring', username: 'Login', password: 'Parol',
    login: 'Kirish', loading: 'Kutilmoqda...', loginError: 'Kirish amalga oshmadi',
    patientBase: 'Bemorlar bazasi', import: 'Excel/CSV import', template: 'Shablon',
    newPatient: 'Yangi bemor', filter: 'Filtrlash', noPatients: 'Bemorlar topilmadi',
    name: 'Ism-familiya', phone: 'Telefon', birthYear: 'Tug‘ilgan yili', address: 'Manzil',
    action: 'Amal', added: 'Qo‘shildi', skipped: 'O‘tkazib yuborildi'
    ,today: 'Bugun', week: 'Bu hafta', month: 'Bu oy', year: 'Bu yil',
    newPayment: 'Yangi to‘lov', paymentHistory: 'To‘lovlar tarixi', search: 'Qidirish',
    from: 'Dan', to: 'Gacha', department: 'Bo‘lim', all: 'Barchasi', total: 'Jami'
  },
  en: {
    clinic: 'Clinic Cashier', cash: 'Cash desk', patients: 'Patients', logout: 'Log out',
    loginTitle: 'Sign in to your account', username: 'Username', password: 'Password',
    login: 'Sign in', loading: 'Please wait...', loginError: 'Sign-in failed',
    patientBase: 'Patient database', import: 'Excel/CSV import', template: 'Template',
    newPatient: 'New patient', filter: 'Filter', noPatients: 'No patients found',
    name: 'Full name', phone: 'Phone', birthYear: 'Birth year', address: 'Address',
    action: 'Actions', added: 'Added', skipped: 'Skipped'
    ,today: 'Today', week: 'This week', month: 'This month', year: 'This year',
    newPayment: 'New payment', paymentHistory: 'Payment history', search: 'Search',
    from: 'From', to: 'To', department: 'Department', all: 'All', total: 'Total'
  },
  ru: {
    clinic: 'Касса клиники', cash: 'Касса', patients: 'Пациенты', logout: 'Выйти',
    loginTitle: 'Войдите в аккаунт', username: 'Логин', password: 'Пароль',
    login: 'Войти', loading: 'Подождите...', loginError: 'Ошибка входа',
    patientBase: 'База пациентов', import: 'Импорт Excel/CSV', template: 'Шаблон',
    newPatient: 'Новый пациент', filter: 'Фильтр', noPatients: 'Пациенты не найдены',
    name: 'ФИО', phone: 'Телефон', birthYear: 'Год рождения', address: 'Адрес',
    action: 'Действия', added: 'Добавлено', skipped: 'Пропущено'
    ,today: 'Сегодня', week: 'Эта неделя', month: 'Этот месяц', year: 'Этот год',
    newPayment: 'Новый платёж', paymentHistory: 'История платежей', search: 'Поиск',
    from: 'С', to: 'По', department: 'Отделение', all: 'Все', total: 'Итого'
  }
}

export function useI18n() {
  const language = useState<Language>('language', () => 'uz')
  const t = (key: string) => messages[language.value][key] || messages.uz[key] || key
  return { language, t, languages: [
    { value: 'uz' as const, label: 'O‘zbekcha' },
    { value: 'en' as const, label: 'English' },
    { value: 'ru' as const, label: 'Русский' }
  ] }
}
