"use client";

import { useEffect, useState } from "react";
import { LOCALES, type Locale, useLocale } from "./LocaleProvider";

type UserRole = "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT" | "CALL_CENTER";

type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
};

type MetricState = {
  totalRequests: number;
  totalErrors: number;
  averageResponseMs: number;
  p95ResponseMs: number;
};

type AppointmentRow = {
  id: string;
  doctorId?: string;
  doctorName?: string;
  patientId?: string;
  patientName?: string;
  identityNumber?: string;
  phone?: string;
  branch?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  channel: string;
  notes?: string | null;
};

type PatientRow = {
  id: string;
  email?: string;
  fullName: string;
  identityNumber: string;
  phone: string;
  gender?: string;
  birthDate?: string;
  createdAt?: string;
};

type DoctorRow = {
  id: string;
  email?: string;
  fullName: string;
  branch: string;
  roomNumber?: string | null;
  active?: boolean;
};

type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  active?: boolean;
  createdAt: string;
};

type MedicalRecordRow = {
  id: string;
  diagnosis: string;
  treatmentPlan: string;
  prescribedBy: string;
  createdAt: string;
};

type PatientDetails = {
  id: string;
  email: string;
  fullName: string;
  identityNumber: string;
  phone: string;
  gender: string;
  birthDate: string;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  appointments: AppointmentRow[];
  medicalRecords: MedicalRecordRow[];
};

type DoctorDashboardData = {
  doctor: {
    id: string;
    email: string;
    fullName: string;
    branch: string;
    roomNumber?: string | null;
    active: boolean;
  };
  appointments: AppointmentRow[];
  patients: Array<
    PatientRow & {
      latestRecord: {
        diagnosis: string;
        treatmentPlan: string;
        prescribedBy: string;
        createdAt: string;
      } | null;
    }
  >;
};

type PatientPortalData = {
  id: string;
  email: string;
  fullName: string;
  identityNumber: string;
  phone: string;
  gender: string;
  birthDate: string;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  upcomingAppointments: AppointmentRow[];
  pastAppointments: AppointmentRow[];
  medicalRecords: MedicalRecordRow[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function toInputDateTime(offsetHours: number) {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const timezoneOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - timezoneOffset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function RolePortal() {
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMode, setAuthMode] = useState<"patient-login" | "patient-register" | "staff-login" | "bootstrap" | "reset-password">(
    "patient-login"
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "admin@hospital.local", password: "Admin12345!" });
  const [bootstrapForm, setBootstrapForm] = useState({
    setupKey: "hospital-admin-setup-key",
    email: "admin@hospital.local",
    password: "Admin12345!"
  });
  const [resetForm, setResetForm] = useState({
    setupKey: "hospital-admin-setup-key",
    email: "admin@hospital.local",
    newPassword: ""
  });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    identityNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    gender: "FEMALE",
    birthDate: "1995-01-01",
    bloodType: "",
    allergies: "",
    chronicConditions: ""
  });

  const [metrics, setMetrics] = useState<MetricState>({
    totalRequests: 0,
    totalErrors: 0,
    averageResponseMs: 0,
    p95ResponseMs: 0
  });
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [doctorDashboard, setDoctorDashboard] = useState<DoctorDashboardData | null>(null);
  const [doctorPatientDetails, setDoctorPatientDetails] = useState<PatientDetails | null>(null);
  const [patientPortal, setPatientPortal] = useState<PatientPortalData | null>(null);
  const [selectedDoctorPatientId, setSelectedDoctorPatientId] = useState("");

  const [staffForm, setStaffForm] = useState({ email: "", password: "", role: "CALL_CENTER" });
  const [patientCreateForm, setPatientCreateForm] = useState({
    email: "",
    password: "",
    identityNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    gender: "FEMALE",
    birthDate: "1990-01-01",
    bloodType: "",
    allergies: "",
    chronicConditions: ""
  });
  const [doctorCreateForm, setDoctorCreateForm] = useState({
    email: "",
    password: "",
    title: "Dr.",
    firstName: "",
    lastName: "",
    branch: "",
    roomNumber: ""
  });
  const { locale, setLocale, t, bundle } = useLocale();

  const localeDateFormat: Record<Locale, string> = {
    az: "az-Latn-AZ",
    en: "en-US",
    ru: "ru-RU",
    tr: "tr-TR"
  };

  function formatDate(dateIso: string) {
    return new Intl.DateTimeFormat(localeDateFormat[locale], {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(dateIso));
  }

  function roleLabel(role: string) {
    return t(`roles.${role}`, role);
  }

  function statusLabel(status: string) {
    return t(`status.${status}`, status);
  }

  function channelLabel(channel: string) {
    return t(`channel.${channel}`, channel);
  }

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: "",
    doctorId: "",
    startsAt: toInputDateTime(24),
    endsAt: toInputDateTime(24.5),
    channel: "call-center",
    notes: ""
  });
  const [patientBookingForm, setPatientBookingForm] = useState({
    doctorId: "",
    startsAt: toInputDateTime(48),
    endsAt: toInputDateTime(48.5),
    notes: ""
  });
  const [medicalRecordForm, setMedicalRecordForm] = useState({
    patientId: "",
    diagnosis: "",
    treatmentPlan: ""
  });
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  async function requestJson<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
    const headers = new Headers(init?.headers ?? {});

    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json");
    }

    if (auth && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as T & { message?: string }) : ({} as T & { message?: string });

    if (!response.ok) {
      throw new Error(data.message ?? "Sorğu uğursuz oldu.");
    }

    return data;
  }

  async function loadCurrentUser(activeToken: string) {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${activeToken}`
      }
    });

    if (!response.ok) {
      globalThis.localStorage?.removeItem("hospital_portal_token");
      setToken("");
      setCurrentUser(null);
      return;
    }

    const user = (await response.json()) as CurrentUser;
    setCurrentUser(user);
  }

  async function loadAdminData() {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [metricData, appointmentData, patientData, doctorData, staffData] = await Promise.all([
      requestJson<MetricState>("/observability/metrics", undefined, false),
      requestJson<AppointmentRow[]>(
        `/appointments/availability?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
      ),
      requestJson<PatientRow[]>("/patients"),
      requestJson<DoctorRow[]>("/doctors"),
      requestJson<AdminUserRow[]>("/admin-users")
    ]);

    setMetrics(metricData);
    setAppointments(appointmentData);
    setPatients(patientData);
    setDoctors(doctorData);
    setAdminUsers(staffData);
  }

  async function loadFrontdeskData() {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const [appointmentData, patientData, doctorData] = await Promise.all([
      requestJson<AppointmentRow[]>(
        `/appointments/availability?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
      ),
      requestJson<PatientRow[]>("/patients"),
      requestJson<DoctorRow[]>("/doctors")
    ]);

    setAppointments(appointmentData);
    setPatients(patientData);
    setDoctors(doctorData);
  }

  async function loadDoctorData() {
    const data = await requestJson<DoctorDashboardData>("/doctors/me/dashboard");
    setDoctorDashboard(data);
    const selectedId = selectedDoctorPatientId || data.patients[0]?.id || "";
    setSelectedDoctorPatientId(selectedId);
    setMedicalRecordForm((current) => ({
      ...current,
      patientId: current.patientId || selectedId
    }));
  }

  async function loadDoctorPatientDetails(patientId: string) {
    if (!patientId) {
      setDoctorPatientDetails(null);
      return;
    }

    const data = await requestJson<PatientDetails>(`/patients/${patientId}/details`);
    setDoctorPatientDetails(data);
  }

  async function loadPatientData() {
    const [portalData, doctorData] = await Promise.all([
      requestJson<PatientPortalData>("/patients/me"),
      requestJson<DoctorRow[]>("/doctors")
    ]);

    setPatientPortal(portalData);
    setDoctors(doctorData);
    setPatientBookingForm((current) => ({
      ...current,
      doctorId: current.doctorId || doctorData[0]?.id || ""
    }));
  }

  async function loadDashboard(role: UserRole) {
    setLoading(true);
    setError("");

    try {
      if (role === "ADMIN") {
        await loadAdminData();
      }

      if (role === "CALL_CENTER" || role === "NURSE") {
        await loadFrontdeskData();
      }

      if (role === "DOCTOR") {
        await loadDoctorData();
      }

      if (role === "PATIENT") {
        await loadPatientData();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("messages.dataLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedToken = globalThis.localStorage?.getItem("hospital_portal_token") ?? "";
    if (savedToken) {
      setToken(savedToken);
      void loadCurrentUser(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    globalThis.localStorage?.setItem("hospital_portal_token", token);
    void loadCurrentUser(token);
  }, [token]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setActiveSection("");
    void loadDashboard(currentUser.role);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== "DOCTOR" || !selectedDoctorPatientId) {
      return;
    }

    setMedicalRecordForm((current) => ({
      ...current,
      patientId: selectedDoctorPatientId
    }));
    void loadDoctorPatientDetails(selectedDoctorPatientId);
  }, [currentUser, selectedDoctorPatientId]);

  function resetFeedback() {
    setMessage("");
    setError("");
  }

  async function submitLogin() {
    resetFeedback();

    try {
      const payload = await requestJson<{ token: string; user: CurrentUser }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(loginForm)
        },
        false
      );

      setToken(payload.token);
      setCurrentUser(payload.user);
      setMessage(`${roleLabel(payload.user.role)} girişi tamamlandı.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.loginError"));
    }
  }

  async function submitBootstrap() {
    resetFeedback();

    try {
      await requestJson(
        "/auth/bootstrap-admin",
        {
          method: "POST",
          body: JSON.stringify(bootstrapForm)
        },
        false
      );

      setMessage(t("messages.adminAccountCreated"));
      setAuthMode("staff-login");
      setLoginForm({ email: bootstrapForm.email, password: bootstrapForm.password });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.bootstrapError"));
    }
  }

  async function submitResetPassword() {
    resetFeedback();

    try {
      const result = await requestJson<{ message: string }>(
        "/auth/reset-admin-password",
        {
          method: "POST",
          body: JSON.stringify(resetForm)
        },
        false
      );

      setMessage(result.message + " İndi yeni şifrə ilə giriş edə bilərsiniz.");
      setAuthMode("staff-login");
      setLoginForm({ email: resetForm.email, password: resetForm.newPassword });
      setResetForm((prev) => ({ ...prev, newPassword: "" }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.resetPasswordError"));
    }
  }

  async function changePassword() {
    resetFeedback();

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setError("Yeni şifrə və təsdiq şifrəsi uyğun gəlmir.");
      return;
    }

    try {
      const result = await requestJson<{ message: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword: changePasswordForm.currentPassword,
            newPassword: changePasswordForm.newPassword
          })
        }
      );

      setMessage(result.message);
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.changePasswordError"));
    }
  }

  async function submitPatientRegister() {
    resetFeedback();

    try {
      const payload = await requestJson<{ token: string; user: CurrentUser }>(
        "/auth/register-patient",
        {
          method: "POST",
          body: JSON.stringify({
            ...registerForm,
            birthDate: new Date(`${registerForm.birthDate}T00:00:00.000Z`).toISOString(),
            bloodType: registerForm.bloodType || undefined,
            allergies: registerForm.allergies || undefined,
            chronicConditions: registerForm.chronicConditions || undefined
          })
        },
        false
      );

      setToken(payload.token);
      setCurrentUser(payload.user);
      setMessage(t("messages.patientAccountCreated"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.registerError"));
    }
  }

  async function createPatient() {
    resetFeedback();

    try {
      await requestJson(
        "/patients",
        {
          method: "POST",
          body: JSON.stringify({
            ...patientCreateForm,
            birthDate: new Date(`${patientCreateForm.birthDate}T00:00:00.000Z`).toISOString(),
            bloodType: patientCreateForm.bloodType || undefined,
            allergies: patientCreateForm.allergies || undefined,
            chronicConditions: patientCreateForm.chronicConditions || undefined
          })
        }
      );

      setMessage(t("messages.patientCreated"));
      setPatientCreateForm({
        email: "",
        password: "",
        identityNumber: "",
        firstName: "",
        lastName: "",
        phone: "",
        gender: "FEMALE",
        birthDate: "1990-01-01",
        bloodType: "",
        allergies: "",
        chronicConditions: ""
      });
      await loadDashboard(currentUser?.role ?? "CALL_CENTER");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.patientCreateError"));
    }
  }

  async function createDoctor() {
    resetFeedback();

    try {
      await requestJson("/doctors", {
        method: "POST",
        body: JSON.stringify({
          ...doctorCreateForm,
          roomNumber: doctorCreateForm.roomNumber || undefined,
          active: true
        })
      });

      setMessage(t("messages.doctorCreated"));
      setDoctorCreateForm({
        email: "",
        password: "",
        title: "Dr.",
        firstName: "",
        lastName: "",
        branch: "",
        roomNumber: ""
      });
      await loadAdminData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.doctorCreateError"));
    }
  }

  async function createStaff() {
    resetFeedback();

    try {
      await requestJson("/admin-users", {
        method: "POST",
        body: JSON.stringify(staffForm)
      });

      setMessage(t("messages.staffAccountCreated", { role: roleLabel(staffForm.role) }));
      setStaffForm({ email: "", password: "", role: "CALL_CENTER" });
      await loadAdminData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.staffCreateError"));
    }
  }

  async function deactivateStaff(id: string) {
    resetFeedback();

    try {
      await requestJson(`/admin-users/${id}/deactivate`, {
        method: "PATCH"
      });
      setMessage("İşçi hesabı deaktiv edildi.");
      await loadAdminData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Deaktivasiya mumkun olmadi.");
    }
  }

  async function deleteStaff(id: string) {
    resetFeedback();

    if (!confirm("Bu işçini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmayacaq.")) {
      return;
    }

    try {
      await requestJson(`/admin-users/${id}`, {
        method: "DELETE"
      });
      setMessage("İşçi uğurla silindi.");
      await loadAdminData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Silinmə uğursuz oldu.");
    }
  }

  async function deactivateDoctor(id: string) {
    resetFeedback();

    try {
      await requestJson(`/doctors/${id}/deactivate`, {
        method: "PATCH"
      });
      setMessage("Hekim deaktiv edildi.");
      await loadAdminData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Deaktivasiya mumkun olmadi.");
    }
  }

  async function deleteDoctor(id: string) {
    resetFeedback();

    if (!confirm("Bu həkimi silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmayacaq.")) {
      return;
    }

    try {
      await requestJson(`/doctors/${id}`, {
        method: "DELETE"
      });
      setMessage("Həkim uğurla silindi.");
      await loadAdminData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Silinmə uğursuz oldu.");
    }
  }

  async function createAppointment(channel: "call-center" | "web" | "mobile") {
    resetFeedback();

    try {
      const body: Record<string, string> = {
        doctorId: appointmentForm.doctorId,
        patientId: appointmentForm.patientId,
        startsAt: new Date(appointmentForm.startsAt).toISOString(),
        endsAt: new Date(appointmentForm.endsAt).toISOString(),
        channel,
        notes: appointmentForm.notes
      };

      await requestJson("/appointments", {
        method: "POST",
        body: JSON.stringify(body)
      });

      setMessage(t("messages.appointmentCreated"));
      await loadDashboard(currentUser?.role ?? "CALL_CENTER");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.appointmentCreateError"));
    }
  }

  async function createPatientAppointment() {
    if (!patientPortal) {
      return;
    }

    resetFeedback();

    try {
      await requestJson("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: patientPortal.id,
          doctorId: patientBookingForm.doctorId,
          startsAt: new Date(patientBookingForm.startsAt).toISOString(),
          endsAt: new Date(patientBookingForm.endsAt).toISOString(),
          channel: "web",
          notes: patientBookingForm.notes
        })
      });

      setMessage(t("messages.appointmentBooked"));
      await loadPatientData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.appointmentBookingError"));
    }
  }

  async function createMedicalRecord() {
    resetFeedback();

    try {
      await requestJson("/medical-records", {
        method: "POST",
        body: JSON.stringify(medicalRecordForm)
      });

      setMessage(t("messages.medicalRecordCreated"));
      await loadDoctorData();
      await loadDoctorPatientDetails(medicalRecordForm.patientId);
      setMedicalRecordForm((current) => ({
        ...current,
        diagnosis: "",
        treatmentPlan: ""
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("messages.medicalRecordCreateError"));
    }
  }

  function logout() {
    setActiveSection("");
    globalThis.localStorage?.removeItem("hospital_portal_token");
    setToken("");
    setCurrentUser(null);
    setDoctorDashboard(null);
    setPatientPortal(null);
    setDoctorPatientDetails(null);
    setMessage(t("messages.logoutSuccess"));
    setError("");
  }

  function renderAuthCard() {
    return (
      <article className="panel-card auth-panel">
        <div className="auth-switcher">
          <button type="button" className={authMode === "patient-login" ? "ghost-button active-chip" : "ghost-button"} onClick={() => setAuthMode("patient-login")}>
            {t("auth.tabs.patientLogin")}
          </button>
          <button type="button" className={authMode === "patient-register" ? "ghost-button active-chip" : "ghost-button"} onClick={() => setAuthMode("patient-register")}>
            {t("auth.tabs.patientRegister")}
          </button>
          <button type="button" className={authMode === "staff-login" ? "ghost-button active-chip" : "ghost-button"} onClick={() => setAuthMode("staff-login")}>
            {t("auth.tabs.staffLogin")}
          </button>
          <button type="button" className={authMode === "bootstrap" ? "ghost-button active-chip" : "ghost-button"} onClick={() => setAuthMode("bootstrap")}>
            {t("auth.tabs.bootstrap")}
          </button>
          <button type="button" className={authMode === "reset-password" ? "ghost-button active-chip" : "ghost-button"} onClick={() => setAuthMode("reset-password")}>
            {t("auth.tabs.resetPassword")}
          </button>
        </div>

        {authMode === "patient-login" || authMode === "staff-login" ? (
          <>
            <span className="eyebrow">{t("auth.headings.secureLogin")}</span>
            <h2>{authMode === "patient-login" ? t("auth.headings.patientPortal") : t("auth.headings.staffPortal")}</h2>
            <p>{t("auth.descriptions.staffIntro")}</p>
            <div className="form-grid single">
              <label>
                {t("auth.form.email")}
                <input value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.password")}
                <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
            </div>
            <button type="button" onClick={() => void submitLogin()}>
              {t("auth.buttons.login")}
            </button>
          </>
        ) : null}

        {authMode === "patient-register" ? (
          <>
            <span className="eyebrow">{t("forms.newPatient")}</span>
            <h2>{t("auth.descriptions.register")}</h2>
            <div className="form-grid">
              <label>
                {t("auth.form.email")}
                <input value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.password")}
                <input type="password" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.identityNumber")}
                <input value={registerForm.identityNumber} onChange={(event) => setRegisterForm((current) => ({ ...current, identityNumber: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.phone")}
                <input value={registerForm.phone} onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.firstName")}
                <input value={registerForm.firstName} onChange={(event) => setRegisterForm((current) => ({ ...current, firstName: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.lastName")}
                <input value={registerForm.lastName} onChange={(event) => setRegisterForm((current) => ({ ...current, lastName: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.gender")}
                <select value={registerForm.gender} onChange={(event) => setRegisterForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="FEMALE">{t("auth.form.genderFemale", "Qadın")}</option>
                  <option value="MALE">{t("auth.form.genderMale", "Kişi")}</option>
                  <option value="OTHER">{t("auth.form.genderOther", "Digər")}</option>
                </select>
              </label>
              <label>
                {t("auth.form.birthDate")}
                <input type="date" value={registerForm.birthDate} onChange={(event) => setRegisterForm((current) => ({ ...current, birthDate: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.bloodType")}
                <input value={registerForm.bloodType} onChange={(event) => setRegisterForm((current) => ({ ...current, bloodType: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.allergies")}
                <input value={registerForm.allergies} onChange={(event) => setRegisterForm((current) => ({ ...current, allergies: event.target.value }))} />
              </label>
            </div>
            <label className="full-width-field">
              {t("auth.form.chronicConditions")}
              <textarea value={registerForm.chronicConditions} onChange={(event) => setRegisterForm((current) => ({ ...current, chronicConditions: event.target.value }))} />
            </label>
            <button type="button" onClick={() => void submitPatientRegister()}>
              {t("auth.buttons.createAccount")}
            </button>
          </>
        ) : null}

        {authMode === "bootstrap" ? (
          <>
            <span className="eyebrow">{t("auth.headings.bootstrap")}</span>
            <h2>{t("auth.headings.bootstrap")}</h2>
            <div className="form-grid single">
              <label>
                {t("auth.form.setupKey")}
                <input value={bootstrapForm.setupKey} onChange={(event) => setBootstrapForm((current) => ({ ...current, setupKey: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.email")}
                <input value={bootstrapForm.email} onChange={(event) => setBootstrapForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.password")}
                <input type="password" value={bootstrapForm.password} onChange={(event) => setBootstrapForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
            </div>
            <button type="button" onClick={() => void submitBootstrap()}>
              {t("auth.buttons.bootstrap")}
            </button>
          </>
        ) : null}

        {authMode === "reset-password" ? (
          <>
            <span className="eyebrow">{t("auth.headings.resetPassword")}</span>
            <h2>{t("auth.headings.resetPassword")}</h2>
            <p>{t("auth.descriptions.resetHint")}</p>
            <div className="form-grid single">
              <label>
                {t("auth.form.setupKey")}
                <input value={resetForm.setupKey} onChange={(event) => setResetForm((current) => ({ ...current, setupKey: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.email")}
                <input value={resetForm.email} onChange={(event) => setResetForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {t("auth.form.newPassword")}
                <input type="password" value={resetForm.newPassword} onChange={(event) => setResetForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="Minimum 8 simvol" />
              </label>
            </div>
            <button type="button" onClick={() => void submitResetPassword()}>
              {t("auth.buttons.resetPassword")}
            </button>
          </>
        ) : null}

        {message ? <p className="status-ok">{message}</p> : null}
        {error ? <p className="status-error">{error}</p> : null}
      </article>
    );
  }

  function renderPublicLanding() {
    return (
      <main className="shell landing-shell">
        <section className="public-grid">
          <article className="hero-card portal-hero">
            <span className="eyebrow">{t("appTitle")}</span>
            <h1>{t("landing.heroTitle")}</h1>
            <p>{t("landing.heroDescription")}</p>
            <div className="hero-stats">
              <div>
                <strong>4</strong>
                <span>{t("landing.stats.portals")}</span>
              </div>
              <div>
                <strong>JWT</strong>
                <span>{t("landing.stats.auth")}</span>
              </div>
              <div>
                <strong>{t("landing.stats.live")}</strong>
                <span>{t("landing.stats.live")}</span>
              </div>
            </div>
            <div className="highlight-list">
              <div className="highlight-item">
                <strong>{t("landing.cards.admin.title")}</strong>
                <p>{t("landing.cards.admin.description")}</p>
              </div>
              <div className="highlight-item">
                <strong>{t("landing.cards.frontdesk.title")}</strong>
                <p>{t("landing.cards.frontdesk.description")}</p>
              </div>
              <div className="highlight-item">
                <strong>{t("landing.cards.doctor.title")}</strong>
                <p>{t("landing.cards.doctor.description")}</p>
              </div>
              <div className="highlight-item">
                <strong>{t("landing.cards.patient.title")}</strong>
                <p>{t("landing.cards.patient.description")}</p>
              </div>
            </div>
          </article>

          {renderAuthCard()}
        </section>
      </main>
    );
  }

  function renderShell(
    title: string,
    subtitle: string,
    navigation: Array<{ key: string; label: string }>,
    body: React.ReactNode
  ) {
    return (
      <main className="admin-shell portal-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <span className="brand-mark">HP</span>
            <div>
              <strong>{title}</strong>
              <p>{subtitle}</p>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Rol menyusu">
            {navigation.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeSection === item.key ? "nav-label active" : "nav-label"}
                onClick={() => setActiveSection(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <span className="eyebrow">{t("shell.activeSession")}</span>
            <strong>{currentUser?.email}</strong>
            <p>{t("shell.roleField")}: {currentUser ? roleLabel(currentUser.role) : "-"}</p>
            <button type="button" className="ghost-button" onClick={logout}>
              {t("auth.buttons.logout", "Çıxış et")}
            </button>
          </div>

          <div className="sidebar-card">
            <span className="eyebrow">{t("ui.language")}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              {Object.entries(bundle.ui.languages).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <section className="dashboard">
          {loading ? <p className="status-ok">{t("messages.loadingData")}</p> : null}
          {message ? <p className="status-ok">{message}</p> : null}
          {error ? <p className="status-error">{error}</p> : null}
          {body}
        </section>
      </main>
    );
  }

  function renderAdminDashboard() {
    const section = activeSection || "dashboard";
    const employeeUsers = adminUsers.filter((item) => item.role !== "PATIENT" && item.role !== "DOCTOR");
    const activeEmployees = employeeUsers.filter((item) => item.active !== false);
    const formerEmployees = employeeUsers.filter((item) => item.active === false);
    const activeDoctors = doctors.filter((doctor) => doctor.active !== false);
    const formerDoctors = doctors.filter((doctor) => doctor.active === false);

    return renderShell(
      t("shell.adminTitle"),
      t("shell.adminSubtitle"),
      [
        { key: "dashboard", label: t("sidebar.dashboard") },
        { key: "staff", label: t("sidebar.staff") },
        { key: "doctors", label: t("sidebar.doctors") },
        { key: "patients", label: t("sidebar.patients") },
        { key: "appointments", label: t("sidebar.appointments") },
        { key: "settings", label: t("sidebar.settings") }
      ],
      <>
        <header className="topbar">
          <div>
            <span className="eyebrow">Yalnız admin</span>
            <h1>Sistem idarəsi bir yerdə</h1>
            <p>{t("admin.description")}</p>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={() => void loadAdminData()}>
              Yenilə
            </button>
          </div>
        </header>

        {section === "dashboard" ? (
          <section className="metrics-grid">
            <article className="metric-card"><span>Toplam sorğu</span><strong>{metrics.totalRequests}</strong><p>Canlı API statistikası</p></article>
            <article className="metric-card"><span>Xəta sayı</span><strong>{metrics.totalErrors}</strong><p>İzləmə paneli</p></article>
            <article className="metric-card"><span>Orta cavab</span><strong>{metrics.averageResponseMs} ms</strong><p>Gecikmə göstəricisi</p></article>
            <article className="metric-card"><span>P95</span><strong>{metrics.p95ResponseMs} ms</strong><p>Yüklənmə sərhədi</p></article>
          </section>
        ) : null}

        {section === "staff" ? (
          <section className="content-grid lower-grid">
            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Isçi hesabı</span><h2>Yeni personal yarat</h2></div></div>
              <div className="form-grid">
                <label>E-poçt<input value={staffForm.email} onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))} /></label>
                <label>Şifrə<input type="password" value={staffForm.password} onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))} /></label>
                <label>Rol<select value={staffForm.role} onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value }))}><option value="CALL_CENTER">Qeydiyyat</option><option value="NURSE">Tibb bacısı</option><option value="ADMIN">Admin</option></select></label>
              </div>
              <button type="button" onClick={() => void createStaff()}>Isçi hesabı yarat</button>
            </article>

            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Keçmiş əməkdaşlar</span><h2>Aktiv və deaktiv işçilər</h2></div></div>
              <div className="stack-list">
                {activeEmployees.map((item) => (
                  <div key={item.id} className="report-item">
                    <strong>{item.email}</strong>
                    <p>{roleLabel(item.role)} • Aktiv</p>
                    <button type="button" className="ghost-button" onClick={() => void deactivateStaff(item.id)}>Deaktiv et</button>
                  </div>
                ))}
                {formerEmployees.map((item) => (
                  <div key={item.id} className="report-item">
                    <strong>{item.email}</strong>
                    <p>{roleLabel(item.role)} • Keçmiş əməkdaş</p>
                    <button type="button" className="danger-button" onClick={() => void deleteStaff(item.id)}>
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {section === "doctors" ? (
          <section className="content-grid lower-grid">
            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Həkim idarəsi</span><h2>Yeni həkim yarat</h2></div></div>
              <div className="form-grid">
                <label>E-poçt<input value={doctorCreateForm.email} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, email: event.target.value }))} /></label>
                <label>Şifrə<input type="password" value={doctorCreateForm.password} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, password: event.target.value }))} /></label>
                <label>Unvan<input value={doctorCreateForm.title} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, title: event.target.value }))} /></label>
                <label>Ad<input value={doctorCreateForm.firstName} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
                <label>Soyad<input value={doctorCreateForm.lastName} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
                <label>Şöbə<input value={doctorCreateForm.branch} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, branch: event.target.value }))} /></label>
                <label>Otaq<input value={doctorCreateForm.roomNumber} onChange={(event) => setDoctorCreateForm((current) => ({ ...current, roomNumber: event.target.value }))} /></label>
              </div>
              <button type="button" onClick={() => void createDoctor()}>{t("buttons.addDoctor")}</button>
            </article>

            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Həkimlər</span><h2>Aktiv və keçmiş həkimlər</h2></div></div>
              <div className="stack-list">
                {activeDoctors.map((doctor) => (
                  <div key={doctor.id} className="report-item">
                    <strong>{doctor.fullName}</strong>
                    <p>{doctor.branch}{doctor.roomNumber ? ` • Otaq ${doctor.roomNumber}` : ""} • Aktiv</p>
                    <button type="button" className="ghost-button" onClick={() => void deactivateDoctor(doctor.id)}>Deaktiv et</button>
                  </div>
                ))}
                {formerDoctors.map((doctor) => (
                  <div key={doctor.id} className="report-item">
                    <strong>{doctor.fullName}</strong>
                    <p>{doctor.branch}{doctor.roomNumber ? ` • Otaq ${doctor.roomNumber}` : ""} • Keçmiş əməkdaş</p>
                    <button type="button" className="danger-button" onClick={() => void deleteDoctor(doctor.id)}>
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {section === "patients" ? (
          <section className="content-grid lower-grid">
            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Qəbul axını</span><h2>Yeni pasiyent qeydiyyatı</h2></div></div>
              <div className="form-grid">
                <label>E-poçt<input value={patientCreateForm.email} onChange={(event) => setPatientCreateForm((current) => ({ ...current, email: event.target.value }))} /></label>
                <label>Şifrə<input type="password" value={patientCreateForm.password} onChange={(event) => setPatientCreateForm((current) => ({ ...current, password: event.target.value }))} /></label>
                <label>Şəxsiyyət nömrəsi<input value={patientCreateForm.identityNumber} onChange={(event) => setPatientCreateForm((current) => ({ ...current, identityNumber: event.target.value }))} /></label>
                <label>Telefon<input value={patientCreateForm.phone} onChange={(event) => setPatientCreateForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label>Ad<input value={patientCreateForm.firstName} onChange={(event) => setPatientCreateForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
                <label>Soyad<input value={patientCreateForm.lastName} onChange={(event) => setPatientCreateForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
                <label>Cins<select value={patientCreateForm.gender} onChange={(event) => setPatientCreateForm((current) => ({ ...current, gender: event.target.value }))}><option value="FEMALE">Qadın</option><option value="MALE">Kişi</option><option value="OTHER">Digər</option></select></label>
                <label>Doğum tarixi<input type="date" value={patientCreateForm.birthDate} onChange={(event) => setPatientCreateForm((current) => ({ ...current, birthDate: event.target.value }))} /></label>
              </div>
              <button type="button" onClick={() => void createPatient()}>{t("buttons.addPatient")}</button>
            </article>

            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Pasiyent siyahisi</span><h2>Son qeydiyyatlar</h2></div></div>
              <div className="stack-list">
                {patients.slice(0, 10).map((patient) => (
                  <div key={patient.id} className="report-item"><strong>{patient.fullName}</strong><p>{patient.identityNumber} • {patient.phone}</p></div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {section === "appointments" ? (
          <section className="content-grid lower-grid">
            <article className="panel-card">
              <div className="panel-head"><div><span className="eyebrow">Randevular</span><h2>Yaxın təqvim</h2></div></div>
              <div className="appointment-list">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="appointment-row"><div><strong>{appointment.doctorName}</strong><p>{appointment.branch} • {formatDate(appointment.startsAt)}</p></div><div className="appointment-meta"><span>{channelLabel(appointment.channel)}</span><span data-status={appointment.status}>{statusLabel(appointment.status)}</span></div></div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {section === "settings" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Hesab tənzimləmələri</span><h2>Şifrə dəyişdirmə</h2></div></div>
            <div className="form-grid single">
              <label>Cari şifrə<input type="password" value={changePasswordForm.currentPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
              <label>Yeni şifrə<input type="password" value={changePasswordForm.newPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label>
              <label>Şifrə təsdiqi<input type="password" value={changePasswordForm.confirmPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
            </div>
            <button type="button" onClick={() => void changePassword()}>Şifrəni dəyişdir</button>
          </article>
        </section>
        ) : null}
      </>
    );
  }

  function renderFrontdeskDashboard() {
    const section = activeSection || "register";

    return renderShell(
      t("shell.deskTitle"),
      t("shell.deskSubtitle"),
      [
        { key: "register", label: t("sidebar.register") },
        { key: "appointments", label: t("sidebar.doBooking") },
        { key: "doctors", label: t("sidebar.doctorFlow") },
        { key: "settings", label: t("sidebar.settings") }
      ],
      <>
        <header className="topbar">
          <div>
            <span className="eyebrow">{t("landing.cards.frontdesk.title")}</span>
            <h1>{t("forms.patientRegistration")}</h1>
            <p>{t("auth.descriptions.staffIntro")}</p>
          </div>
          <div className="topbar-actions"><button type="button" onClick={() => void loadFrontdeskData()}>{t("auth.buttons.login", "Yenilə")}</button></div>
        </header>

        {section === "register" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Yeni pasiyent</span><h2>Qeydiyyat formu</h2></div></div>
            <div className="form-grid">
              <label>E-poçt<input value={patientCreateForm.email} onChange={(event) => setPatientCreateForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Şifrə<input type="password" value={patientCreateForm.password} onChange={(event) => setPatientCreateForm((current) => ({ ...current, password: event.target.value }))} /></label>
              <label>Şəxsiyyət nömrəsi<input value={patientCreateForm.identityNumber} onChange={(event) => setPatientCreateForm((current) => ({ ...current, identityNumber: event.target.value }))} /></label>
              <label>Telefon<input value={patientCreateForm.phone} onChange={(event) => setPatientCreateForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Ad<input value={patientCreateForm.firstName} onChange={(event) => setPatientCreateForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
              <label>Soyad<input value={patientCreateForm.lastName} onChange={(event) => setPatientCreateForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
            </div>
            <button type="button" onClick={() => void createPatient()}>Pasiyenti qeyd et</button>
          </article>

          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Son qeydiyyatlar</span><h2>Yeni pasiyentlər</h2></div></div>
            <div className="stack-list">
              {patients.slice(0, 8).map((patient) => (
                <div key={patient.id} className="report-item"><strong>{patient.fullName}</strong><p>{patient.identityNumber} • {patient.phone}</p></div>
              ))}
            </div>
          </article>
        </section>
        ) : null}

        {section === "appointments" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Həkimə yönləndirmə</span><h2>Çakışmasız randevu yarat</h2></div></div>
            <div className="form-grid">
              <label>Pasiyent<select value={appointmentForm.patientId} onChange={(event) => setAppointmentForm((current) => ({ ...current, patientId: event.target.value }))}><option value="">Seçin</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} ({patient.identityNumber})</option>)}</select></label>
              <label>Həkim<select value={appointmentForm.doctorId} onChange={(event) => setAppointmentForm((current) => ({ ...current, doctorId: event.target.value }))}><option value="">Seçin</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName} ({doctor.branch})</option>)}</select></label>
              <label>Başlama<input type="datetime-local" value={appointmentForm.startsAt} onChange={(event) => setAppointmentForm((current) => ({ ...current, startsAt: event.target.value }))} /></label>
              <label>Bitmə<input type="datetime-local" value={appointmentForm.endsAt} onChange={(event) => setAppointmentForm((current) => ({ ...current, endsAt: event.target.value }))} /></label>
            </div>
            <label className="full-width-field">Qeyd<textarea value={appointmentForm.notes} onChange={(event) => setAppointmentForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            <button type="button" onClick={() => void createAppointment("call-center")}>Randevu yarat</button>
          </article>
        </section>
        ) : null}

        {section === "doctors" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Bugünkü axın</span><h2>Yaxın randevular</h2></div></div>
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="appointment-row"><div><strong>{appointment.doctorName}</strong><p>{appointment.branch} • {formatDate(appointment.startsAt)}</p></div><div className="appointment-meta"><span>{statusLabel(appointment.status)}</span><span>{channelLabel(appointment.channel)}</span></div></div>
              ))}
            </div>
          </article>
        </section>
        ) : null}

        {section === "settings" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Hesab tənzimləmələri</span><h2>Şifrə dəyişdirmə</h2></div></div>
            <div className="form-grid single">
              <label>Cari şifrə<input type="password" value={changePasswordForm.currentPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
              <label>Yeni şifrə<input type="password" value={changePasswordForm.newPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label>
              <label>Şifrə təsdiqi<input type="password" value={changePasswordForm.confirmPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
            </div>
            <button type="button" onClick={() => void changePassword()}>Şifrəni dəyişdir</button>
          </article>
        </section>
        ) : null}
      </>
    );
  }

  function renderDoctorDashboard() {
    const section = activeSection || "appointments";

    return renderShell(
      t("shell.doctorTitle"),
      t("shell.doctorSubtitle"),
      [
        { key: "appointments", label: t("sidebar.appointments") },
        { key: "patients", label: t("sidebar.profile") },
        { key: "records", label: t("sidebar.reports") },
        { key: "settings", label: t("sidebar.settings") }
      ],
      <>
        <header className="topbar">
          <div>
            <span className="eyebrow">{t("landing.cards.doctor.title")}</span>
            <h1>{doctorDashboard?.doctor.fullName}</h1>
            <p>
              {doctorDashboard?.doctor.branch}{doctorDashboard?.doctor.roomNumber ? ` • Otaq ${doctorDashboard.doctor.roomNumber}` : ""}
            </p>
          </div>
          <div className="topbar-actions"><button type="button" onClick={() => void loadDoctorData()}>{t("auth.buttons.refresh", "Yenilə")}</button></div>
        </header>

        {section === "appointments" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Günün cədvəli</span><h2>Randevularım</h2></div></div>
            <div className="appointment-list">
              {doctorDashboard?.appointments.map((appointment) => (
                <button key={appointment.id} type="button" className="row-button" onClick={() => setSelectedDoctorPatientId(appointment.patientId ?? "") }>
                  <div className="appointment-row full-row"><div><strong>{appointment.patientName}</strong><p>{appointment.identityNumber} • {formatDate(appointment.startsAt)}</p></div><div className="appointment-meta"><span>{statusLabel(appointment.status)}</span><span>{appointment.phone}</span></div></div>
                </button>
              ))}
            </div>
          </article>

          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Pasiyent profili</span><h2>{doctorPatientDetails?.fullName ?? "Pasiyent seçin"}</h2></div></div>
            {doctorPatientDetails ? (
              <div className="detail-stack">
                <div className="info-grid">
                  <div><span>Kimlik</span><strong>{doctorPatientDetails.identityNumber}</strong></div>
                  <div><span>Telefon</span><strong>{doctorPatientDetails.phone}</strong></div>
                  <div><span>Qan qrupu</span><strong>{doctorPatientDetails.bloodType || "-"}</strong></div>
                  <div><span>Allergiya</span><strong>{doctorPatientDetails.allergies || "-"}</strong></div>
                </div>
                <div className="stack-list">
                  <h3>Keçmiş randevular</h3>
                  {doctorPatientDetails.appointments.map((appointment) => (
                    <div key={appointment.id} className="report-item"><strong>{appointment.doctorName}</strong><p>{formatDate(appointment.startsAt)} • {statusLabel(appointment.status)}</p></div>
                  ))}
                </div>
                <div className="stack-list">
                  <h3>Rapor və təyinatlar</h3>
                  {doctorPatientDetails.medicalRecords.map((record) => (
                    <div key={record.id} className="report-item"><strong>{record.diagnosis}</strong><p>{record.prescribedBy} • {record.treatmentPlan}</p></div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="empty-state">Detalları görmək üçün sol tərəfdən bir pasiyent seçin.</p>
            )}
          </article>
        </section>
        ) : null}

        {section === "records" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Tibbi qeyd</span><h2>Yeni rapor və təyinat</h2></div></div>
            <div className="form-grid single">
              <label>Pasiyent<select value={medicalRecordForm.patientId} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, patientId: event.target.value }))}><option value="">Seçin</option>{doctorDashboard?.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} ({patient.identityNumber})</option>)}</select></label>
              <label>Diaqnoz<input value={medicalRecordForm.diagnosis} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, diagnosis: event.target.value }))} /></label>
            </div>
            <label className="full-width-field">Təyinat və müalicə planı<textarea value={medicalRecordForm.treatmentPlan} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, treatmentPlan: event.target.value }))} /></label>
            <button type="button" onClick={() => void createMedicalRecord()}>Qeydi saxla</button>
          </article>

          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Seçilmiş pasiyent</span><h2>Tibbi tarixçə</h2></div></div>
            <div className="stack-list">
              {doctorPatientDetails?.medicalRecords.map((record) => (
                <div key={record.id} className="report-item"><strong>{record.diagnosis}</strong><p>{record.prescribedBy} • {record.treatmentPlan}</p></div>
              ))}
            </div>
          </article>
        </section>
        ) : null}

        {section === "patients" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Pasiyent siyahısı</span><h2>Mənə təhkim olunmuş pasiyentlər</h2></div></div>
            <div className="stack-list">
              {doctorDashboard?.patients.map((patient) => (
                <button key={patient.id} type="button" className="row-button" onClick={() => setSelectedDoctorPatientId(patient.id)}>
                  <div className="report-item selectable-item"><strong>{patient.fullName}</strong><p>{patient.latestRecord?.diagnosis ?? "Hələ tibbi qeyd yoxdur"}</p></div>
                </button>
              ))}
            </div>
          </article>
        </section>
        ) : null}

        {section === "settings" ? (
        <section className="content-grid lower-grid">
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Hesab tənzimləmələri</span><h2>Şifrə dəyişdirmə</h2></div></div>
            <div className="form-grid single">
              <label>Cari şifrə<input type="password" value={changePasswordForm.currentPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label>
              <label>Yeni şifrə<input type="password" value={changePasswordForm.newPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label>
              <label>Şifrə təsdiqi<input type="password" value={changePasswordForm.confirmPassword} onChange={(event) => setChangePasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>
            </div>
            <button type="button" onClick={() => void changePassword()}>Şifrəni dəyişdir</button>
          </article>
        </section>
        ) : null}
      </>
    );
  }

  function renderPatientDashboard() {
    const section = activeSection || "booking";

    return renderShell(
      t("shell.patientTitle"),
      t("shell.patientSubtitle"),
      [
        { key: "booking", label: t("sidebar.doBooking") },
        { key: "profile", label: t("sidebar.profile") },
        { key: "history", label: t("sidebar.history") },
        { key: "reports", label: t("sidebar.reports") }
      ],
      <>
        <header className="topbar">
          <div>
            <span className="eyebrow">{t("landing.cards.patient.title")}</span>
            <h1>{patientPortal?.fullName}</h1>
            <p>{patientPortal?.identityNumber} • {patientPortal?.phone}</p>
          </div>
          <div className="topbar-actions"><button type="button" onClick={() => void loadPatientData()}>{t("auth.buttons.refresh", "Yenilə")}</button></div>
        </header>

        {section === "booking" || section === "profile" ? (
        <section className="content-grid lower-grid">
          {section === "booking" ? (
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Yeni randevu</span><h2>Həkim seç və vaxt al</h2></div></div>
            <div className="form-grid">
              <label>Həkim<select value={patientBookingForm.doctorId} onChange={(event) => setPatientBookingForm((current) => ({ ...current, doctorId: event.target.value }))}><option value="">Seçin</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName} ({doctor.branch})</option>)}</select></label>
              <label>Başlama<input type="datetime-local" value={patientBookingForm.startsAt} onChange={(event) => setPatientBookingForm((current) => ({ ...current, startsAt: event.target.value }))} /></label>
              <label>Bitmə<input type="datetime-local" value={patientBookingForm.endsAt} onChange={(event) => setPatientBookingForm((current) => ({ ...current, endsAt: event.target.value }))} /></label>
            </div>
            <label className="full-width-field">Qeyd<textarea value={patientBookingForm.notes} onChange={(event) => setPatientBookingForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            <button type="button" onClick={() => void createPatientAppointment()}>Randevu al</button>
          </article>
          ) : null}

          {section === "profile" ? (
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Profil</span><h2>Tibbi məlumatlarım</h2></div></div>
            <div className="info-grid">
              <div><span>Qan qrupu</span><strong>{patientPortal?.bloodType || "-"}</strong></div>
              <div><span>Allergiyalar</span><strong>{patientPortal?.allergies || "-"}</strong></div>
              <div><span>Xroniki xəstəliklər</span><strong>{patientPortal?.chronicConditions || "-"}</strong></div>
              <div><span>Cins</span><strong>{patientPortal?.gender || "-"}</strong></div>
            </div>
          </article>
          ) : null}
        </section>
        ) : null}

        {section === "history" || section === "reports" ? (
        <section className="content-grid lower-grid">
          {section === "history" ? (
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Yaxın randevular</span><h2>Yeni və aktiv görüşlərim</h2></div></div>
            <div className="appointment-list">
              {patientPortal?.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="appointment-row"><div><strong>{appointment.doctorName}</strong><p>{appointment.branch} • {formatDate(appointment.startsAt)}</p></div><div className="appointment-meta"><span>{channelLabel(appointment.channel)}</span><span data-status={appointment.status}>{statusLabel(appointment.status)}</span></div></div>
              ))}
            </div>
          </article>
          ) : null}

          {section === "reports" ? (
          <article className="panel-card">
            <div className="panel-head"><div><span className="eyebrow">Keçmiş və raporlar</span><h2>Əvvəlki görüşlər və reseptlər</h2></div></div>
            <div className="stack-list">
              {patientPortal?.pastAppointments.map((appointment) => (
                <div key={appointment.id} className="report-item"><strong>{appointment.doctorName}</strong><p>{formatDate(appointment.startsAt)} • {statusLabel(appointment.status)}</p></div>
              ))}
              {patientPortal?.medicalRecords.map((record) => (
                <div key={record.id} className="report-item"><strong>{record.diagnosis}</strong><p>{record.prescribedBy} • {record.treatmentPlan}</p></div>
              ))}
            </div>
          </article>
          ) : null}
        </section>
        ) : null}
      </>
    );
  }

  if (!currentUser) {
    return renderPublicLanding();
  }

  if (currentUser.role === "ADMIN") {
    return renderAdminDashboard();
  }

  if (currentUser.role === "DOCTOR") {
    return renderDoctorDashboard();
  }

  if (currentUser.role === "CALL_CENTER" || currentUser.role === "NURSE") {
    return renderFrontdeskDashboard();
  }

  return renderPatientDashboard();
}