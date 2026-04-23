const ru = {
  appTitle: "Hospital Platform",
  ui: {
    language: "Язык",
    languages: {
      az: "Azərbaycan dili",
      en: "English",
      ru: "Русский",
      tr: "Türkçe"
    }
  },
  roles: {
    ADMIN: "Админ",
    DOCTOR: "Врач",
    NURSE: "Медсестра",
    CALL_CENTER: "Регистратура",
    PATIENT: "Пациент"
  },
  auth: {
    tabs: {
      patientLogin: "Вход пациента",
      patientRegister: "Регистрация пациента",
      staffLogin: "Вход персонала",
      bootstrap: "Настройка админа",
      resetPassword: "Сброс пароля"
    },
    headings: {
      patientPortal: "Войдите в портал пациента",
      staffPortal: "Войдите в панель персонала",
      bootstrap: "Только для первой админ-учетной записи",
      resetPassword: "Обновите пароль администратора",
      secureLogin: "Безопасный вход"
    },
    descriptions: {
      staffIntro: "Админ получает панель управления, врач видит только своих пациентов и записи, регистратура управляет приемом.",
      register: "Создайте учетную запись и управляйте своими записями.",
      resetHint: "Если вы знаете ключ установки, вы можете сбросить пароль администратора."
    },
    form: {
      email: "Электронная почта",
      password: "Пароль",
      identityNumber: "Номер удостоверения",
      phone: "Телефон",
      firstName: "Имя",
      lastName: "Фамилия",
      gender: "Пол",
      genderFemale: "Женский",
      genderMale: "Мужской",
      genderOther: "Другой",
      birthDate: "Дата рождения",
      bloodType: "Группа крови",
      allergies: "Аллергии",
      chronicConditions: "Хронические заболевания",
      setupKey: "Ключ установки",
      currentPassword: "Текущий пароль",
      newPassword: "Новый пароль",
      confirmPassword: "Подтвердите пароль"
    },
    buttons: {
      login: "Войти",
      logout: "Выйти",
      refresh: "Обновить",
      createAccount: "Создать аккаунт",
      bootstrap: "Создать админ аккаунт",
      resetPassword: "Сбросить пароль",
      updatePassword: "Изменить пароль",
      addDoctor: "Добавить врача",
      addPatient: "Добавить пациента"
    }
  },
  landing: {
    heroTitle: "Отдельные рабочие экраны для каждой роли",
    heroDescription: "Пациенты управляют записями, врачи видят своих пациентов, регистратура эффективно направляет прием.",
    stats: {
      portals: "Отдельные порталы",
      auth: "Ролевой вход",
      live: "Живой API поток"
    },
    cards: {
      admin: {
        title: "Админ",
        description: "Управление системой, учетными записями персонала, контроль врачей и регистратуры."
      },
      frontdesk: {
        title: "Регистратура",
        description: "Проверка документов, прием пациентов, безконфликтное назначение врача."
      },
      doctor: {
        title: "Врач",
        description: "Дневные записи, профиль пациента, лечение и назначения."
      },
      patient: {
        title: "Пациент",
        description: "Новые записи, прошлые встречи, отчеты и рецепты."
      }
    }
  },
  sidebar: {
    dashboard: "Панель",
    staff: "Персонал",
    doctors: "Врачи",
    patients: "Пациенты",
    appointments: "Записи",
    settings: "Настройки",
    register: "Регистрация пациента",
    doBooking: "Планирование",
    doctorFlow: "Врачебный поток",
    profile: "Профиль",
    history: "Прошлые визиты",
    reports: "Отчеты"
  },
  shell: {
    adminTitle: "Панель администратора",
    adminSubtitle: "Управление системой",
    deskTitle: "Панель регистратуры",
    deskSubtitle: "Проверка и маршрутизация",
    doctorTitle: "Панель врача",
    doctorSubtitle: "Поток пациентов на сегодня",
    patientTitle: "Портал пациента",
    patientSubtitle: "Личные записи и отчеты",
    activeSession: "Активная сессия",
    roleField: "Роль"
  },
  admin: {
    description: "Управляйте учётными записями персонала, добавляйте новых врачей, следите за потоком запросов."
  },
  metrics: {
    totalRequests: "Всего запросов",
    totalErrors: "Ошибки",
    averageResponseMs: "Средний отклик",
    p95: "P95",
    liveData: "Метрики API",
    trace: "Панель мониторинга",
    latency: "Задержка",
    load: "Предел загрузки"
  },
  forms: {
    newStaff: "Создать нового сотрудника",
    newDoctor: "Создать нового врача",
    newPatient: "Новый пациент",
    patientRegistration: "Форма регистрации пациента",
    appointmentBooking: "Создать запись без конфликта",
    schedule: "Ближайший график",
    patientProfile: "Профиль пациента",
    patientDetails: "Медицинская история",
    newRecord: "Новый отчет и назначение"
  },
  status: {
    CONFIRMED: "Подтверждено",
    PENDING: "В ожидании",
    COMPLETED: "Завершено",
    CANCELED: "Отменено",
    NO_SHOW: "Не пришел"
  },
  channel: {
    web: "Веб",
    mobile: "Мобильный",
    "call-center": "Колл-центр"
  },
  confirm: {
    deleteStaff: "Вы уверены, что хотите удалить этого сотрудника? Это действие необратимо.",
    deleteDoctor: "Вы уверены, что хотите удалить этого врача? Это действие необратимо."
  },
  messages: {
    loadingData: "Загрузка данных...",
    loggedOut: "Выход выполнен.",
    deleteSuccess: "Удалено успешно.",
    dataLoadError: "Данные не удалось загрузить.",
    loginError: "Вход не удался.",
    loginSuccess: "Вход выполнен успешно.",
    bootstrapError: "Инициализация не удалась.",
    resetPasswordError: "Сброс пароля не удался.",
    changePasswordError: "Изменение пароля не удалось.",
    registerError: "Регистрация не удалась.",
    adminAccountCreated: "Учётная запись администратора создана. Теперь вы можете войти как администратор.",
    patientAccountCreated: "Ваша учётная запись пациента создана и вы вошли в систему.",
    patientCreated: "Регистрация пациента завершена.",
    patientCreateError: "Пациент не может быть создан.",
    patientAdded: "Пациент успешно добавлен.",
    doctorCreated: "Новый врач добавлен.",
    doctorCreateError: "Врач не может быть создан.",
    doctorAdded: "Врач успешно добавлен.",
    staffCreateError: "Учетная запись персонала не может быть создана.",
    staffAccountCreated: "Учётная запись {{role}} создана.",
    staffDeactivated: "Учетная запись персонала деактивирована.",
    deactivationError: "Деактивация не удалась.",
    deleteError: "Удаление не удалось.",
    doctorDeleted: "Врач успешно удалён.",
    nurseDeleted: "Медсестра успешно удалена.",
    appointmentCreated: "Запись создана.",
    appointmentCreateError: "Запись не может быть создана.",
    appointmentBooked: "Ваш запрос на запись зарегистрирован.",
    appointmentBookingError: "Запись не может быть забронирована.",
    medicalRecordCreated: "Медицинская запись добавлена для пациента.",
    medicalRecordCreateError: "Медицинская запись не может быть создана.",
    medicalRecordAdded: "Медицинская запись добавлена для пациента.",
    medicalRecordError: "Медицинская запись не может быть записана.",
    callCenterUserCreated: "Новый пользователь колл-центра создан.",
    unknownError: "Произошла неизвестная ошибка.",
    logoutSuccess: "Выход выполнен."
  }
};

export default ru;
