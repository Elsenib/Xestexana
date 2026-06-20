"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "PATIENT"
  | "CALL_CENTER";

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
  doctorName: string;
  branch: string;
  startsAt: string;
  endsAt: string;
  status: string;
  channel: string;
};

type PatientRow = {
  id: string;
  fullName: string;
  identityNumber: string;
  phone: string;
};

type DoctorRow = {
  id: string;
  fullName: string;
  branch: string;
  roomNumber?: string | null;
  active?: boolean;
};

type StaffRow = {
  id: string;
  email: string;
  role: string;
  active?: boolean;
  createdAt: string;
};

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  active: boolean;
  isOverdue: boolean;
  assignee: {
    id: string;
    email: string;
    role: string;
  };
};

type BackendCapabilities = {
  tasks: boolean;
  observability: boolean;
};

type PanelView = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "RECEPTION";
type WorkProgram = "OPERATIONS" | "ANALYTICS" | "LAB";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://api-production-e6391.up.railway.app/api";
const TOKEN_KEY = "ld_staff_token";

type MenuItem = {
  key:
    | "dashboard"
    | "appointments"
    | "patients"
    | "doctors"
    | "treatments"
    | "cash"
    | "finance"
    | "inventory"
    | "tasks"
    | "notifications"
    | "reports"
    | "users";
  label: string;
  icon: string;
  adminOnly?: boolean;
  superOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { key: "dashboard", label: "İdarə Paneli", icon: "⌂" },
  { key: "appointments", label: "Randevular", icon: "◫" },
  { key: "patients", label: "Pasiyentlər", icon: "P" },
  { key: "doctors", label: "Həkimlər", icon: "+" },
  { key: "treatments", label: "Müalicə", icon: "M" },
  { key: "cash", label: "Kassa", icon: "₼" },
  { key: "finance", label: "Maliyyə", icon: "F", superOnly: true },
  { key: "inventory", label: "Anbar", icon: "A" },
  { key: "tasks", label: "Tapşırıqlar", icon: "✓" },
  { key: "notifications", label: "Bildirişlər", icon: "B" },
  { key: "reports", label: "Hesabatlar", icon: "H", superOnly: true },
  {
    key: "users",
    label: "İstifadəçilər",
    icon: "✓",
    adminOnly: true,
    superOnly: true,
  },
];

const panelConfigs: Record<
  PanelView,
  {
    label: string;
    icon: string;
    menuKeys: MenuItem["key"][];
    description: string;
  }
> = {
  SUPER_ADMIN: {
    label: "Super Admin Paneli",
    icon: "SA",
    menuKeys: [
      "dashboard",
      "finance",
      "reports",
      "users",
      "notifications",
      "tasks",
    ],
    description: "Klinikalararası nəzarət, hesabat və strateji görünüş",
  },
  ADMIN: {
    label: "Admin Paneli",
    icon: "AD",
    menuKeys: [
      "dashboard",
      "appointments",
      "patients",
      "doctors",
      "treatments",
      "cash",
      "inventory",
      "tasks",
      "notifications",
    ],
    description: "Gündəlik klinika əməliyyatı, komanda və axın idarəsi",
  },
  DOCTOR: {
    label: "Həkim Paneli",
    icon: "DR",
    menuKeys: [
      "dashboard",
      "appointments",
      "patients",
      "treatments",
      "tasks",
      "notifications",
    ],
    description: "Pasiyent, müalicə planı və iş gündəliyi",
  },
  RECEPTION: {
    label: "Qeydiyyat Paneli",
    icon: "RC",
    menuKeys: [
      "dashboard",
      "appointments",
      "patients",
      "cash",
      "notifications",
    ],
    description: "Qeydiyyat, randevu və pasiyent əlaqə axını",
  },
};

const workProgramConfigs: Record<
  WorkProgram,
  {
    label: string;
    icon: string;
    menuKeys: MenuItem["key"][];
    description: string;
  }
> = {
  OPERATIONS: {
    label: "Operativ",
    icon: "OP",
    menuKeys: [
      "dashboard",
      "appointments",
      "patients",
      "doctors",
      "treatments",
      "cash",
      "inventory",
      "tasks",
      "notifications",
      "users",
    ],
    description: "Gündəlik panel işi: qəbul, randevu, müalicə və kassa",
  },
  ANALYTICS: {
    label: "Hesabat",
    icon: "AN",
    menuKeys: ["dashboard", "finance", "reports", "notifications"],
    description: "Statistika, rəhbərlik baxışı və maliyyə göstəriciləri",
  },
  LAB: {
    label: "Laboratoriya",
    icon: "LB",
    menuKeys: ["patients", "appointments", "treatments", "notifications"],
    description: "Lab axını və pasiyent klinik məlumatlarının işi",
  },
};

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("az-Latn-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateIso));
}

function toInputDateTime(offsetHours: number) {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60_000);
  return local.toISOString().slice(0, 16);
}

function statusBadgeClass(status: string) {
  if (status === "CONFIRMED") return "live";
  if (status === "PENDING") return "wait";
  return "";
}

function appointmentStatusLabel(status: string) {
  if (status === "PENDING") return "Gözləyir";
  if (status === "CONFIRMED") return "Təsdiqlənib";
  if (status === "COMPLETED") return "Tamamlanıb";
  if (status === "CANCELED" || status === "CANCELLED") return "Ləğv edilib";
  if (status === "NO_SHOW") return "Gəlməyib";
  return status;
}

function taskStatusLabel(status: TaskRow["status"], isOverdue: boolean) {
  if (isOverdue) return "Gecikib";
  if (status === "PENDING") return "Gözləyir";
  if (status === "IN_PROGRESS") return "İcradadır";
  if (status === "COMPLETED") return "Tamamlanıb";
  if (status === "CANCELLED") return "Ləğv edilib";
  return status;
}

export function LovelyDentDashboard() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [metrics, setMetrics] = useState<MetricState>({
    totalRequests: 0,
    totalErrors: 0,
    averageResponseMs: 0,
    p95ResponseMs: 0,
  });
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffRow[]>([]);
  const [nurses, setNurses] = useState<StaffRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [capabilities, setCapabilities] = useState<BackendCapabilities>({
    tasks: false,
    observability: false,
  });

  const [patientForm, setPatientForm] = useState({
    email: "",
    password: "",
    identityNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    gender: "FEMALE",
    birthDate: "1990-01-01",
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: "",
    doctorId: "",
    startsAt: toInputDateTime(24),
    endsAt: toInputDateTime(24.5),
    channel: "call-center",
    notes: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigneeUserId: "",
    dueDate: toInputDateTime(24),
    priority: "MEDIUM",
  });

  const [cashForm, setCashForm] = useState({
    amount: "120",
    description: "Qismən ödəniş",
    customerEmail: "",
  });
  const [paymentLink, setPaymentLink] = useState("");

  const [active, setActive] = useState<MenuItem["key"]>("dashboard");
  const [panelView, setPanelView] = useState<PanelView>("ADMIN");
  const [workProgram, setWorkProgram] = useState<WorkProgram>("OPERATIONS");

  const isAnyAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const isSuperAdmin =
    currentUser?.role === "SUPER_ADMIN" || panelView === "SUPER_ADMIN";

  const availablePanels = useMemo<PanelView[]>(() => {
    if (currentUser?.role === "SUPER_ADMIN") {
      return ["SUPER_ADMIN", "ADMIN", "DOCTOR", "RECEPTION"];
    }

    if (currentUser?.role === "ADMIN") {
      return ["ADMIN", "SUPER_ADMIN", "DOCTOR", "RECEPTION"];
    }

    if (currentUser?.role === "DOCTOR") {
      return ["DOCTOR"];
    }

    if (currentUser?.role === "CALL_CENTER") {
      return ["RECEPTION"];
    }

    return ["ADMIN"];
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role === "SUPER_ADMIN") {
      setPanelView("SUPER_ADMIN");
      return;
    }

    if (currentUser?.role === "ADMIN") {
      setPanelView("ADMIN");
      return;
    }

    if (currentUser?.role === "DOCTOR") {
      setPanelView("DOCTOR");
      return;
    }

    if (currentUser?.role === "CALL_CENTER") {
      setPanelView("RECEPTION");
    }
  }, [currentUser?.role]);

  const availablePrograms = useMemo<WorkProgram[]>(() => {
    if (panelView === "SUPER_ADMIN" || panelView === "ADMIN") {
      return ["OPERATIONS", "ANALYTICS", "LAB"];
    }

    if (panelView === "DOCTOR") {
      return ["OPERATIONS", "LAB"];
    }

    return ["OPERATIONS"];
  }, [panelView]);

  useEffect(() => {
    if (!availablePrograms.includes(workProgram)) {
      setWorkProgram(availablePrograms[0]);
    }
  }, [availablePrograms, workProgram]);

  const visibleMenu = useMemo(() => {
    const panelKeys = panelConfigs[panelView].menuKeys;
    const programKeys = workProgramConfigs[workProgram].menuKeys;
    return menuItems.filter((item) => {
      if (!panelKeys.includes(item.key)) {
        return false;
      }
      if (!programKeys.includes(item.key)) {
        return false;
      }
      if (item.adminOnly && !isAnyAdmin) {
        return false;
      }
      if (item.superOnly && !isSuperAdmin) {
        return false;
      }
      if (item.key === "tasks" && !capabilities.tasks) {
        return false;
      }
      return true;
    });
  }, [isAnyAdmin, isSuperAdmin, capabilities.tasks, panelView, workProgram]);

  const quickMenuItems = useMemo(
    () =>
      visibleMenu.filter((item) =>
        [
          "dashboard",
          "appointments",
          "patients",
          "doctors",
          "treatments",
          "cash",
          "inventory",
          "tasks",
          "notifications",
          "reports",
          "users",
          "finance",
        ].includes(item.key),
      ),
    [visibleMenu],
  );

  async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let serverMessage = "Sorğu uğursuz oldu.";
      try {
        const payload = await response.json();
        serverMessage = payload?.message ?? serverMessage;
      } catch {
        // no-op
      }
      throw new Error(serverMessage);
    }

    if (response.status === 204) {
      return null as T;
    }
    return response.json() as Promise<T>;
  }

  async function loadData(
    authToken = token,
    role = currentUser?.role,
    caps: BackendCapabilities = capabilities,
  ) {
    if (!authToken || !role) {
      return;
    }

    const headers = { Authorization: `Bearer ${authToken}` };
    const hasAdminScope = role === "ADMIN" || role === "SUPER_ADMIN";
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      setLoading(true);
      setError("");

      const requests: Promise<any>[] = [
        fetch(
          `${API_BASE}/appointments/availability?startDate=${encodeURIComponent(now.toISOString())}&endDate=${encodeURIComponent(nextWeek.toISOString())}`,
          { headers },
        ),
        fetch(`${API_BASE}/patients?take=100`, { headers }),
        fetch(`${API_BASE}/doctors?take=100`, { headers }),
      ];

      if (caps.tasks) {
        requests.push(fetch(`${API_BASE}/tasks?take=100`, { headers }));
      }

      if (hasAdminScope) {
        if (caps.observability) {
          requests.push(
            fetch(`${API_BASE}/observability/metrics`, { headers }),
          );
        }
        requests.push(fetch(`${API_BASE}/admin-users?take=100`, { headers }));
        requests.push(fetch(`${API_BASE}/nurses?take=100`, { headers }));
      }

      const responses = await Promise.all(requests);
      let index = 0;
      const appointmentsRes = responses[index++];
      const patientsRes = responses[index++];
      const doctorsRes = responses[index++];
      const tasksRes = caps.tasks ? responses[index++] : null;
      const metricsRes =
        hasAdminScope && caps.observability ? responses[index++] : null;
      const staffRes = hasAdminScope ? responses[index++] : null;
      const nursesRes = hasAdminScope ? responses[index++] : null;

      if (appointmentsRes?.ok) {
        const data = await appointmentsRes.json();
        setAppointments(Array.isArray(data) ? data : []);
      }
      if (patientsRes?.ok) {
        const data = await patientsRes.json();
        const rows = Array.isArray(data) ? data : [];
        setPatients(rows);
        if (!appointmentForm.patientId && rows.length > 0) {
          setAppointmentForm((prev) => ({ ...prev, patientId: rows[0].id }));
        }
      }
      if (doctorsRes?.ok) {
        const data = await doctorsRes.json();
        const rows = Array.isArray(data) ? data : [];
        setDoctors(rows);
        if (!appointmentForm.doctorId && rows.length > 0) {
          setAppointmentForm((prev) => ({ ...prev, doctorId: rows[0].id }));
        }
      }
      if (tasksRes?.ok) {
        const data = await tasksRes.json();
        const rows = Array.isArray(data) ? data : [];
        setTasks(rows);
        if (!taskForm.assigneeUserId && rows.length > 0) {
          setTaskForm((prev) => ({
            ...prev,
            assigneeUserId: rows[0]?.assignee?.id ?? prev.assigneeUserId,
          }));
        }
      }
      if (metricsRes?.ok) {
        const data = await metricsRes.json();
        setMetrics({
          totalRequests: data.totalRequests ?? 0,
          totalErrors: data.totalErrors ?? 0,
          averageResponseMs: data.averageResponseMs ?? 0,
          p95ResponseMs: data.p95ResponseMs ?? 0,
        });
      }
      if (staffRes?.ok) {
        const data = await staffRes.json();
        setStaffUsers(Array.isArray(data) ? data : []);
      }
      if (nursesRes?.ok) {
        const data = await nursesRes.json();
        setNurses(Array.isArray(data) ? data : []);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Panel məlumatları yüklənmədi.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function hydrateSession(authToken: string) {
    const me = await requestJson<CurrentUser>("/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setCurrentUser(me);
    const tasksRes = await fetch(`${API_BASE}/tasks?take=1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const metricsRes = await fetch(`${API_BASE}/observability/metrics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const caps = {
      tasks: tasksRes.status !== 404,
      observability: metricsRes.status !== 404,
    };
    setCapabilities(caps);
    await loadData(authToken, me.role, caps);
  }

  useEffect(() => {
    const savedToken = globalThis.localStorage?.getItem(TOKEN_KEY) ?? "";
    if (!savedToken) {
      return;
    }
    setToken(savedToken);
    void hydrateSession(savedToken).catch(() => {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
      setToken("");
      setCurrentUser(null);
    });
  }, []);

  async function doLogin() {
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("E-poçt və şifrə məcburidir.");
      return;
    }

    try {
      setLoading(true);
      const payload = await requestJson<{ token: string; user: CurrentUser }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );

      if (payload.user.role === "PATIENT") {
        setError("Bu giriş ekranı yalnız işçi panelləri üçündür.");
        return;
      }

      setToken(payload.token);
      setCurrentUser(payload.user);
      globalThis.localStorage?.setItem(TOKEN_KEY, payload.token);
      setMessage("Giriş uğurludur.");
      await loadData(payload.token, payload.user.role);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Giriş uğursuz oldu.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createPatient() {
    setError("");
    setMessage("");

    try {
      setLoading(true);
      await requestJson<{ id: string }>("/patients", {
        method: "POST",
        body: JSON.stringify({
          ...patientForm,
          birthDate: new Date(
            `${patientForm.birthDate}T00:00:00.000Z`,
          ).toISOString(),
        }),
      });

      setMessage("Pasiyent uğurla yaradıldı.");
      setPatientForm({
        email: "",
        password: "",
        identityNumber: "",
        firstName: "",
        lastName: "",
        phone: "",
        gender: "FEMALE",
        birthDate: "1990-01-01",
      });
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Pasiyent yaradılmadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createAppointment() {
    setError("");
    setMessage("");

    if (!appointmentForm.patientId || !appointmentForm.doctorId) {
      setError("Randevu üçün həkim və pasiyent seçilməlidir.");
      return;
    }

    try {
      setLoading(true);
      await requestJson<{ id: string; status: string }>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...appointmentForm,
          startsAt: new Date(appointmentForm.startsAt).toISOString(),
          endsAt: new Date(appointmentForm.endsAt).toISOString(),
        }),
      });

      setMessage("Randevu uğurla yaradıldı.");
      setAppointmentForm((prev) => ({
        ...prev,
        startsAt: toInputDateTime(24),
        endsAt: toInputDateTime(24.5),
        notes: "",
      }));
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Randevu yaradılmadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    if (!capabilities.tasks) {
      setError("Tapşırıq bölməsi bu backend versiyasında aktiv deyil.");
      return;
    }

    if (!taskForm.title.trim() || !taskForm.assigneeUserId) {
      setError("Tapşırıq başlığı və məsul işçi məcburidir.");
      return;
    }

    try {
      setLoading(true);
      await requestJson<{ id: string }>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          assigneeUserId: taskForm.assigneeUserId,
          dueDate: new Date(taskForm.dueDate).toISOString(),
          priority: taskForm.priority,
        }),
      });

      setMessage("Tapşırıq uğurla yaradıldı.");
      setTaskForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        dueDate: toInputDateTime(24),
        priority: "MEDIUM",
      }));
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Tapşırıq yaradılmadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function initiateCashPayment() {
    setError("");
    setMessage("");

    const amount = Number(cashForm.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !cashForm.customerEmail.trim()
    ) {
      setError("Ödəniş məbləği və pasiyent e-poçtu məcburidir.");
      return;
    }

    try {
      setLoading(true);
      const payload = await requestJson<{ paymentUrl: string }>(
        "/payment/paymes-initiate",
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            description: cashForm.description.trim() || "Kassa ödənişi",
            customerEmail: cashForm.customerEmail.trim(),
          }),
        },
      );

      setPaymentLink(payload.paymentUrl);
      setMessage("Ödəniş linki yaradıldı.");
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Ödəniş linki yaradılmadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskRow["status"]) {
    if (!capabilities.tasks) {
      setError("Tapşırıq bölməsi bu backend versiyasında aktiv deyil.");
      return;
    }

    try {
      setLoading(true);
      await requestJson(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Tapşırıq statusu yenilənmədi.",
      );
    } finally {
      setLoading(false);
    }
  }

  function doLogout() {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    setToken("");
    setCurrentUser(null);
    setAppointments([]);
    setPatients([]);
    setDoctors([]);
    setStaffUsers([]);
    setNurses([]);
    setTasks([]);
    setPaymentLink("");
    setMessage("Çıxış edildi.");
  }

  if (!currentUser) {
    return (
      <main className="ld-app ld-auth-root">
        <section className="ld-auth-card">
          <img src="/lovelydent-icon.png" alt="LovelyDent" />
          <h1>LovelyDent İşçi Girişi</h1>
          <p>
            Admin, çağrı mərkəzi, həkim və tibb bacısı panellərinə təhlükəsiz
            giriş.
          </p>

          {message && <div className="ld-banner success">{message}</div>}
          {error && <div className="ld-banner error">{error}</div>}

          <label>
            E-poçt
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@lovelydent.az"
            />
          </label>
          <label>
            Şifrə
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
          </label>
          <button
            className="ld-primary"
            onClick={() => void doLogin()}
            disabled={loading}
          >
            {loading ? "Giriş edilir..." : "Daxil ol"}
          </button>
        </section>
      </main>
    );
  }

  const canManageBookings = isAnyAdmin || currentUser.role === "CALL_CENTER";
  const assignableUsers = [...staffUsers, ...nurses];
  const overdueTasks = tasks.filter((task) => task.isOverdue).length;
  const roleFocus =
    panelView === "SUPER_ADMIN"
      ? [
          "Klinikalararası performans və gəlir trendlərini izlə",
          "Riskli qərarları üst səviyyədə prioritetləşdir",
          "Abunəlik, hesabat və maliyyə xəttini rəhbərlik baxışında saxla",
        ]
      : panelView === "DOCTOR"
        ? [
            "Pasiyent tarixçəsini və müalicə planını qısa saxla",
            "Randevuların icrasını və müalicə mərhələsini izləyin",
            "Klinik qeydləri həkim panelində tamamla",
          ]
        : panelView === "RECEPTION"
          ? [
              "Qeydiyyat və randevu axınını sürətli saxla",
              "Pasiyent məlumatını dəqiq tamamla",
              "Qeydiyyat tamamlananda bildiriş axınını izləyin",
            ]
          : [
              "Gündəlik randevu və pasiyent axınını sabit tut",
              "Heyət tapşırıqlarını gecikmədən idarə et",
              "Kassa, müalicə və qəbz proseslərini standartlaşdır",
            ];

  return (
    <main className="ld-shell">
      <header className="ld-shell-head">
        <div className="ld-shell-brand">
          <img src="/lovelydent-icon.png" alt="LovelyDent" />
          <div>
            <b>LovelyDent Command Center</b>
            <span>
              {panelConfigs[panelView].label} ·{" "}
              {panelConfigs[panelView].description}
            </span>
          </div>
        </div>

        <div className="ld-shell-actions">
          <div
            className="ld-panel-switcher"
            role="tablist"
            aria-label="Panel keçidləri"
          >
            {availablePanels.map((panel) => (
              <button
                key={panel}
                role="tab"
                aria-selected={panelView === panel}
                className={panelView === panel ? "active" : ""}
                onClick={() => setPanelView(panel)}
              >
                <i>{panelConfigs[panel].icon}</i>
                {panelConfigs[panel].label}
              </button>
            ))}
          </div>

          <div
            className="ld-program-switcher"
            role="tablist"
            aria-label="Proqram keçidləri"
          >
            {availablePrograms.map((program) => (
              <button
                key={program}
                role="tab"
                aria-selected={workProgram === program}
                className={workProgram === program ? "active" : ""}
                onClick={() => setWorkProgram(program)}
              >
                <i>{workProgramConfigs[program].icon}</i>
                {workProgramConfigs[program].label}
              </button>
            ))}
          </div>

          <div className="ld-user-chip">
            <i>{currentUser.email.slice(0, 2).toUpperCase()}</i>
            <div>
              <b>{currentUser.email}</b>
              <span>
                {currentUser.role} · {panelView}
              </span>
            </div>
          </div>

          <button
            className="ld-primary"
            onClick={() => void loadData()}
            disabled={loading}
          >
            {loading ? "Yüklənir..." : "Sinxron et"}
          </button>
          <button className="ld-ghost" onClick={doLogout}>
            Çıxış
          </button>
        </div>
      </header>

      <nav className="ld-command-nav" aria-label="Panel bölmələri">
        {visibleMenu.map((item) => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={active === item.key ? "active" : ""}
          >
            <i>{item.icon}</i>
            {item.label}
          </button>
        ))}
      </nav>

      <section className="ld-workspace">
        {error && <div className="ld-banner error">{error}</div>}
        {message && <div className="ld-banner success">{message}</div>}

        <section className="ld-role-brief">
          <article>
            <span>Aktiv panel</span>
            <b>{panelConfigs[panelView].label}</b>
            <small>{panelConfigs[panelView].description}</small>
          </article>
          <article>
            <span>Aktiv proqram</span>
            <b>{workProgramConfigs[workProgram].label}</b>
            <small>{workProgramConfigs[workProgram].description}</small>
          </article>
          <article>
            <span>Tapşırıq temperaturu</span>
            <b>{tasks.length}</b>
            <small>
              {overdueTasks > 0
                ? `${overdueTasks} gecikmiş tapşırıq var`
                : "Gecikən tapşırıq yoxdur"}
            </small>
          </article>
        </section>

        <section className="ld-kpi-strip">
          <Stat
            label="RANDEVU AXINI"
            value={String(appointments.length)}
            detail="Qarşıdakı 7 gün"
            icon="◫"
            tone="yellow"
          />
          <Stat
            label="PASİYENT BAZASI"
            value={String(patients.length)}
            detail="Aktiv qeydiyyatlar"
            icon="P"
            tone="blue"
          />
          <Stat
            label="KLİNİK HEYƏT"
            value={String(doctors.length)}
            detail="Aktiv həkimlər"
            icon="+"
            tone="green"
          />
          <Stat
            label={
              capabilities.observability ? "SİSTEM RİSKİ" : "TAPŞIRIQ YÜKÜ"
            }
            value={
              capabilities.observability
                ? String(metrics.totalErrors)
                : String(tasks.length)
            }
            detail={
              capabilities.observability
                ? `P95: ${Math.round(metrics.p95ResponseMs)} ms`
                : "Cari tapşırıqlar"
            }
            icon="!"
            tone="violet"
          />
        </section>

        {active === "tasks" && capabilities.tasks && (
          <section className="ld-card ld-simple-list">
            <CardHead
              title="Tapşırıqlar"
              subtitle="Status, prioritet və gecikmə izlənməsi"
            />

            {isAnyAdmin && (
              <div className="ld-form-grid">
                <input
                  placeholder="Tapşırıq başlığı"
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Qısa açıqlama"
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
                <select
                  value={taskForm.assigneeUserId}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      assigneeUserId: event.target.value,
                    }))
                  }
                >
                  <option value="">Məsul işçi seçin</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={taskForm.dueDate}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      dueDate: event.target.value,
                    }))
                  }
                />
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      priority: event.target.value,
                    }))
                  }
                >
                  <option value="LOW">Aşağı</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksək</option>
                </select>
                <button
                  className="ld-primary"
                  onClick={() => void createTask()}
                  disabled={loading}
                >
                  Tapşırıq yarat
                </button>
              </div>
            )}

            {tasks.length === 0 && <EmptyState text="Hələ tapşırıq yoxdur." />}
            {tasks.map((task) => (
              <div className="ld-simple-row" key={task.id}>
                <b>{task.title}</b>
                <span>{task.assignee.email}</span>
                <span>{formatDate(task.dueDate)}</span>
                <em
                  className={
                    task.isOverdue
                      ? "wait"
                      : task.status === "COMPLETED"
                        ? "live"
                        : ""
                  }
                >
                  {taskStatusLabel(task.status, task.isOverdue)}
                </em>
                <div className="ld-task-actions">
                  <button
                    onClick={() =>
                      void updateTaskStatus(task.id, "IN_PROGRESS")
                    }
                  >
                    İcradadır
                  </button>
                  <button
                    onClick={() => void updateTaskStatus(task.id, "COMPLETED")}
                  >
                    Tamamlandı
                  </button>
                  <button
                    onClick={() => void updateTaskStatus(task.id, "CANCELLED")}
                  >
                    Ləğv et
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {active === "treatments" && (
          <section className="ld-module-shell">
            <ModuleHeader
              title="Müalicə paneli"
              subtitle="Mərhələ, xidmət, qiymətləndirmə və zəmanət axını"
            />
            <div className="ld-module-grid">
              <ModuleCard
                title="Müalicə planı"
                lines={[
                  "Pasiyent üçün mərhələli plan",
                  "İcra statusu: planlandı / icrada / tamamlandı",
                  "Həkim qeydləri və tarixçə",
                ]}
              />
              <ModuleCard
                title="Xidmət siyahısı"
                lines={[
                  "Klinika xidmət kataloqu",
                  "Qiymət və müddət konfiqurasiyası",
                  "Filial/şöbə üzrə fərqləndirmə",
                ]}
              />
              <ModuleCard
                title="Zəmanət və implant"
                lines={[
                  "Zəmanət kartı şablonu",
                  "İmplant marka/seriya məlumatı",
                  "Nəzarət vizit tarixçəsi",
                ]}
              />
            </div>
            <ModuleTable
              title="Müalicə iş axını (vizual)"
              columns={["Mərhələ", "Məsul", "Status", "Tarix"]}
              rows={[
                ["Diaqnostika", "Dr. Nigar", "Tamamlanıb", "20.06.2026"],
                ["Plan təsdiqi", "Dr. Nigar", "İcradadır", "21.06.2026"],
                ["Prosedur", "Tibb bacısı", "Gözləyir", "22.06.2026"],
              ]}
            />
          </section>
        )}

        {active === "cash" && (
          <section className="ld-module-shell">
            <ModuleHeader
              title="Kassa paneli"
              subtitle="Ödəniş, qismən ödəniş, depozit və borc izlənməsi"
            />
            <div className="ld-module-grid">
              <ModuleCard
                title="Ödənişlər"
                lines={[
                  "Nağd, kart və transfer axını",
                  "Paymes linki ilə uzaq ödəniş",
                  "Qəbz və əməliyyat izi",
                ]}
              />
              <ModuleCard
                title="Qismən ödəniş və depozit"
                lines={[
                  "Müalicə üzrə mərhələli yığım",
                  "Depozit balansı",
                  "Qalıq borc avtomatik izlənir",
                ]}
              />
              <ModuleCard
                title="Borc və xatırlatma"
                lines={[
                  "Gecikmiş ödəniş siyahısı",
                  "Xatırlatma üçün növbə",
                  "Admin və super admin nəzarəti",
                ]}
              />
            </div>
            <div className="ld-form-grid">
              <input
                inputMode="decimal"
                placeholder="Məbləğ, məsələn 120"
                value={cashForm.amount}
                onChange={(event) =>
                  setCashForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
              />
              <input
                placeholder="Pasiyent e-poçtu"
                value={cashForm.customerEmail}
                onChange={(event) =>
                  setCashForm((prev) => ({
                    ...prev,
                    customerEmail: event.target.value,
                  }))
                }
              />
              <input
                placeholder="Təsvir, məsələn qismən ödəniş"
                value={cashForm.description}
                onChange={(event) =>
                  setCashForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
              <button
                className="ld-primary"
                onClick={() => void initiateCashPayment()}
                disabled={loading}
              >
                {loading ? "Link yaradılır..." : "Ödəniş linki yarat"}
              </button>
            </div>
            {paymentLink && (
              <div className="ld-banner success" style={{ marginTop: 12 }}>
                Hazır ödəniş linki:{" "}
                <a href={paymentLink} target="_blank" rel="noreferrer">
                  {paymentLink}
                </a>
              </div>
            )}
            <ModuleTable
              title="Kassa axını (vizual)"
              columns={["Pasiyent", "Əməliyyat", "Məbləğ", "Status"]}
              rows={[
                ["Aysel Məmmədova", "Qismən ödəniş", "120 ₼", "Təsdiq"],
                ["Murad Həsənli", "Depozit", "300 ₼", "Təsdiq"],
                ["Leyla Rzayeva", "Borc", "90 ₼", "Gecikib"],
              ]}
            />
          </section>
        )}

        {active === "finance" && (
          <section className="ld-module-shell">
            <ModuleHeader
              title="Maliyyə paneli"
              subtitle="Gəlir, xərc, maaş və dövr hesabatları"
            />
            <div className="ld-module-grid">
              <ModuleCard
                title="Gəlir paneli"
                lines={[
                  "Gündəlik dövriyyə",
                  "Şöbə üzrə bölgü",
                  "Trend qrafik sahəsi",
                ]}
              />
              <ModuleCard
                title="Xərc idarəsi"
                lines={[
                  "Kateqoriya üzrə xərclər",
                  "Təchizatçı ödənişləri",
                  "Dövri xərc şablonları",
                ]}
              />
              <ModuleCard
                title="Maaş paneli"
                lines={[
                  "Həkim faiz modeli",
                  "Maaş hesablama draft",
                  "Təsdiq mərhələsi",
                ]}
              />
            </div>
            <ModuleTable
              title="Maliyyə icmalı (vizual)"
              columns={["Kateqoriya", "Bu gün", "Bu ay", "Trend"]}
              rows={[
                ["Gəlir", "2 840 ₼", "58 400 ₼", "↑"],
                ["Xərc", "760 ₼", "14 900 ₼", "→"],
                ["Maaş", "-", "19 200 ₼", "↑"],
              ]}
            />
          </section>
        )}

        {active === "inventory" && (
          <section className="ld-module-shell">
            <ModuleHeader
              title="Anbar paneli"
              subtitle="Məhsul, təchizatçı, alış və minimum stok nəzarəti"
            />
            <div className="ld-module-grid">
              <ModuleCard
                title="Məhsul kartları"
                lines={[
                  "Kateqoriya və barkod",
                  "Cari stok və minimum limit",
                  "Saxlama yeri",
                ]}
              />
              <ModuleCard
                title="Təchizatçılar"
                lines={[
                  "Müqavilə və əlaqə məlumatı",
                  "Qiymət müqayisəsi",
                  "Tarixçə",
                ]}
              />
              <ModuleCard
                title="Stok xəbərdarlığı"
                lines={[
                  "Minimum stok triggeri",
                  "Sifariş draftı",
                  "Məsul şəxs bildirişi",
                ]}
              />
            </div>
            <ModuleTable
              title="Anbar vəziyyəti (vizual)"
              columns={["Məhsul", "Cari stok", "Min limit", "Vəziyyət"]}
              rows={[
                ["Anesteziya ampula", "14", "20", "Aşağı"],
                ["İmplant seti", "36", "15", "Normal"],
                ["Maska", "110", "80", "Normal"],
              ]}
            />
          </section>
        )}

        {active === "notifications" && (
          <section className="ld-module-shell">
            <ModuleHeader
              title="Bildiriş və xatırlatma"
              subtitle="SMS, WhatsApp, Email şablon və göndəriş monitorinqi"
            />
            <div className="ld-module-grid">
              <ModuleCard
                title="Şablon idarəsi"
                lines={[
                  "Randevu təsdiq şablonu",
                  "Ləğv/xatırlatma şablonları",
                  "Dil versiyaları",
                ]}
              />
              <ModuleCard
                title="Göndəriş monitorinqi"
                lines={[
                  "Uğurlu/ugursuz log",
                  "Provider cavab kodları",
                  "Təkrar göndərmə düyməsi",
                ]}
              />
              <ModuleCard
                title="Avtomatik triggerlər"
                lines={[
                  "Randevu öncəsi xatırlatma",
                  "Ödəniş gecikməsi bildirişi",
                  "Müalicə mərhələ bildirimi",
                ]}
              />
            </div>
            <ModuleTable
              title="Son bildirişlər (vizual)"
              columns={["Kanal", "Mövzu", "Qəbul edən", "Status"]}
              rows={[
                ["SMS", "Randevu xatırlatma", "+99450******", "Uğurlu"],
                ["WhatsApp", "Randevu təsdiq", "+99455******", "Uğurlu"],
                ["Email", "Ödəniş gecikməsi", "p***@mail.com", "Növbədə"],
              ]}
            />
          </section>
        )}

        {active === "reports" && (
          <section className="ld-module-shell">
            <ModuleHeader
              title="Hesabatlar"
              subtitle="Statistika paneli və export mərhələləri (PDF / Excel)"
            />
            <div className="ld-module-grid">
              <ModuleCard
                title="Pasiyent statistikası"
                lines={[
                  "Yeni pasiyentlər",
                  "Aktiv pasiyentlər",
                  "Yaş qrupu bölgüsü",
                ]}
              />
              <ModuleCard
                title="Həkim və randevu"
                lines={["Qəbul sayı", "Tamamlanma faizi", "Boş slot analizi"]}
              />
              <ModuleCard
                title="Export mərkəzi"
                lines={[
                  "PDF export paneli",
                  "Excel export paneli",
                  "Tarix aralığı filtrləri",
                ]}
              />
            </div>
            <ModuleTable
              title="Hesabat preview (vizual)"
              columns={["Hesabat", "Dövr", "Format", "Əməliyyat"]}
              rows={[
                ["Gündəlik maliyyə", "20.06.2026", "PDF", "Yarat"],
                ["Randevu statistikası", "İyun 2026", "Excel", "Yarat"],
                ["Pasiyent xülasəsi", "Q2 2026", "PDF", "Yarat"],
              ]}
            />
          </section>
        )}

        {active === "dashboard" && (
          <>
            <section className="ld-grid">
              <article className="ld-card ld-schedule">
                <CardHead title="Yaxınlaşan randevular" subtitle="İlk 8 qeyd" />
                <div className="ld-table-head">
                  <span>SAAT</span>
                  <span>HƏKİM</span>
                  <span>ŞÖBƏ</span>
                  <span>STATUS</span>
                  <span />
                </div>
                {appointments.length === 0 && (
                  <EmptyState text="Qarşıdakı 7 gün üçün randevu yoxdur." />
                )}
                {appointments.slice(0, 8).map((item) => (
                  <div className="ld-appt" key={item.id}>
                    <b className="ld-time">
                      {formatDate(item.startsAt).split(" ")[1] ??
                        formatDate(item.startsAt)}
                    </b>
                    <div className="ld-person">
                      <i>{item.doctorName.slice(0, 2).toUpperCase()}</i>
                      <p>
                        <b>{item.doctorName}</b>
                        <span>{item.channel}</span>
                      </p>
                    </div>
                    <p>
                      <b>{item.branch}</b>
                      <span>{formatDate(item.startsAt)}</span>
                    </p>
                    <em className={statusBadgeClass(item.status)}>
                      {appointmentStatusLabel(item.status)}
                    </em>
                    <button aria-label="actions">•••</button>
                  </div>
                ))}
              </article>

              <aside className="ld-right-column">
                <article className="ld-card ld-focus-card">
                  <CardHead
                    title={
                      isSuperAdmin
                        ? "Super Admin prioritetləri"
                        : "Admin prioritetləri"
                    }
                    subtitle="Bu həftəlik icra fokusları"
                  />
                  <ul>
                    {roleFocus.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="ld-card ld-roadmap-card">
                  <CardHead
                    title="Panel qeydləri"
                    subtitle="Bu həftə üçün operativ fokus"
                  />
                  <ul>
                    <li>Randevu gecikmələrinin azaldılması</li>
                    <li>Qeydiyyat axınında məlumat tamlığı nəzarəti</li>
                    <li>Kassa və bildiriş prosesinin gündəlik monitorinqi</li>
                  </ul>
                </article>
              </aside>
            </section>
          </>
        )}

        {active === "appointments" && (
          <section className="ld-card ld-simple-list">
            <CardHead title="Randevular" subtitle="Qarşıdakı 7 gün" />
            {canManageBookings && (
              <div className="ld-form-grid">
                <select
                  value={appointmentForm.patientId}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      patientId: event.target.value,
                    }))
                  }
                >
                  <option value="">Pasiyent seçin</option>
                  {patients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName}
                    </option>
                  ))}
                </select>
                <select
                  value={appointmentForm.doctorId}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      doctorId: event.target.value,
                    }))
                  }
                >
                  <option value="">Həkim seçin</option>
                  {doctors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={appointmentForm.startsAt}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      startsAt: event.target.value,
                    }))
                  }
                />
                <input
                  type="datetime-local"
                  value={appointmentForm.endsAt}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({
                      ...prev,
                      endsAt: event.target.value,
                    }))
                  }
                />
                <button
                  className="ld-primary"
                  onClick={() => void createAppointment()}
                  disabled={loading}
                >
                  Randevu yarat
                </button>
              </div>
            )}
            {appointments.length === 0 && (
              <EmptyState text="Randevu siyahısı boşdur." />
            )}
            {appointments.map((item) => (
              <div className="ld-simple-row" key={item.id}>
                <b>{formatDate(item.startsAt)}</b>
                <span>{item.doctorName}</span>
                <span>{item.branch}</span>
                <em className={statusBadgeClass(item.status)}>
                  {appointmentStatusLabel(item.status)}
                </em>
              </div>
            ))}
          </section>
        )}

        {active === "patients" && (
          <section className="ld-card ld-simple-list">
            <CardHead title="Pasiyent siyahısı" subtitle="İlk 100 qeyd" />
            {canManageBookings && (
              <div className="ld-form-grid">
                <input
                  placeholder="Ad"
                  value={patientForm.firstName}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      firstName: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Soyad"
                  value={patientForm.lastName}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      lastName: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Şəxsiyyət nömrəsi"
                  value={patientForm.identityNumber}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      identityNumber: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Telefon"
                  value={patientForm.phone}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="E-posta"
                  value={patientForm.email}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
                <input
                  type="password"
                  placeholder="Şifrə"
                  value={patientForm.password}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
                <input
                  type="date"
                  value={patientForm.birthDate}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      birthDate: event.target.value,
                    }))
                  }
                />
                <select
                  value={patientForm.gender}
                  onChange={(event) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      gender: event.target.value,
                    }))
                  }
                >
                  <option value="FEMALE">Qadın</option>
                  <option value="MALE">Kişi</option>
                  <option value="OTHER">Digər</option>
                </select>
                <button
                  className="ld-primary"
                  onClick={() => void createPatient()}
                  disabled={loading}
                >
                  Pasiyent yarat
                </button>
              </div>
            )}
            {patients.length === 0 && (
              <EmptyState text="Pasiyent siyahısı boşdur." />
            )}
            {patients.map((item) => (
              <div className="ld-simple-row" key={item.id}>
                <b>{item.fullName}</b>
                <span>{item.identityNumber}</span>
                <span>{item.phone}</span>
              </div>
            ))}
          </section>
        )}

        {active === "doctors" && (
          <section className="ld-card ld-simple-list">
            <CardHead title="Həkim siyahısı" subtitle="Şöbə və otaq məlumatı" />
            {doctors.length === 0 && (
              <EmptyState text="Həkim siyahısı boşdur." />
            )}
            {doctors.map((item) => (
              <div className="ld-simple-row" key={item.id}>
                <b>{item.fullName}</b>
                <span>{item.branch}</span>
                <span>{item.roomNumber || "-"}</span>
                <em className={item.active ? "live" : "wait"}>
                  {item.active ? "AKTİV" : "PASSİV"}
                </em>
              </div>
            ))}
          </section>
        )}

        {active === "users" && isAnyAdmin && (
          <section className="ld-card ld-simple-list">
            <CardHead
              title="Klinika istifadəçiləri"
              subtitle="Admin + çağrı mərkəzi + tibb bacısı"
            />
            {[...staffUsers, ...nurses].length === 0 && (
              <EmptyState text="İstifadəçi siyahısı boşdur." />
            )}
            {[...staffUsers, ...nurses].map((item) => (
              <div className="ld-simple-row" key={item.id}>
                <b>{item.email}</b>
                <span>{item.role}</span>
                <span>{formatDate(item.createdAt)}</span>
                <em className={item.active ? "live" : "wait"}>
                  {item.active ? "AKTİV" : "PASSİV"}
                </em>
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
      <i className={tone}>{icon}</i>
    </article>
  );
}

function CardHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="ld-card-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="ld-empty-state">{text}</div>;
}

function ModuleHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="ld-module-head">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function ModuleCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <article className="ld-module-card">
      <h3>{title}</h3>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

function ModuleTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="ld-module-table">
      <h3>{title}</h3>
      <div className="ld-module-table-head">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div className="ld-module-table-row" key={row.join("|")}>
          {row.map((cell) => (
            <span key={cell}>{cell}</span>
          ))}
        </div>
      ))}
    </section>
  );
}
