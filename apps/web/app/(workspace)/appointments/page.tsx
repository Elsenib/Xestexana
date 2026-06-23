"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiRequest, type CurrentUser, type StaffRole } from "../../../lib/lovelydent-api";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "IN_TREATMENT" | "COMPLETED" | "CANCELED" | "NO_SHOW";

type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  identityNumber: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  roomNumber: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  channel: "web" | "mobile" | "call-center";
  notes?: string | null;
};

type Doctor = {
  id: string;
  fullName: string;
  branch: string;
  roomNumber?: string;
  active: boolean;
};

type Patient = {
  id: string;
  fullName: string;
  identityNumber: string;
  phone: string;
};

const statusLabel: Record<AppointmentStatus, string> = {
  PENDING: "Gözləyir",
  CONFIRMED: "Təsdiqlənib",
  CHECKED_IN: "Klinikadadır",
  IN_TREATMENT: "Müalicədə",
  COMPLETED: "Tamamlandı",
  CANCELED: "Ləğv edildi",
  NO_SHOW: "Gəlmədi"
};

const nextStatus: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING: ["CONFIRMED", "CANCELED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELED", "NO_SHOW"],
  CHECKED_IN: ["IN_TREATMENT", "CANCELED", "NO_SHOW"],
  IN_TREATMENT: ["COMPLETED", "CANCELED"]
};

function toDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocal(date: Date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 16);
}

function hour(value: string) {
  return new Intl.DateTimeFormat("az-AZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function day(value: string) {
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "short", weekday: "short" }).format(new Date(value));
}

export default function Page() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [date, setDate] = useState(toDateInput());
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [startsAt, setStartsAt] = useState(() => toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeDoctors = useMemo(() => doctors.filter((doctor) => doctor.active), [doctors]);
  const selectedDayAppointments = useMemo(() => appointments, [appointments]);
  const stats = useMemo(() => {
    const active = appointments.filter((item) => !["COMPLETED", "CANCELED", "NO_SHOW"].includes(item.status)).length;
    const checkedIn = appointments.filter((item) => ["CHECKED_IN", "IN_TREATMENT"].includes(item.status)).length;
    const completed = appointments.filter((item) => item.status === "COMPLETED").length;
    return { active, checkedIn, completed };
  }, [appointments]);

  async function loadWeekCounts(anchor = date) {
    const start = new Date(`${anchor}T12:00:00`);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    try {
      const rows = await apiRequest<Appointment[]>(
        `/appointments?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
      );
      const counts: Record<string, number> = {};
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        counts[toDateInput(day)] = 0;
      }
      for (const row of rows) {
        const key = toDateInput(new Date(row.startsAt));
        if (counts[key] !== undefined) counts[key] += 1;
      }
      setWeekCounts(counts);
    } catch {
      setWeekCounts({});
    }
  }

  async function loadData(selectedDate = date) {
    setLoading(true);
    setError("");
    const start = new Date(`${selectedDate}T00:00:00`);
    const end = new Date(`${selectedDate}T23:59:59`);
    try {
      const [appointmentRows, doctorRows, patientRows] = await Promise.all([
        apiRequest<Appointment[]>(`/appointments?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        apiRequest<Doctor[]>("/doctors?active=true&take=200"),
        apiRequest<Patient[]>("/patients?take=200")
      ]);
      setAppointments(appointmentRows);
      setDoctors(doctorRows);
      setPatients(patientRows);
      setDoctorId((current) => current || doctorRows[0]?.id || "");
      setPatientId((current) => current || patientRows[0]?.id || "");
      await loadWeekCounts(selectedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Məlumatlar yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiRequest<CurrentUser>("/auth/me").then((user) => setRole(user.role)).catch(() => setRole(null));
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const startDate = new Date(startsAt);
    const endDate = new Date(startDate.getTime() + Number(duration) * 60000);

    try {
      await apiRequest("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          doctorId,
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
          channel: "call-center",
          notes: notes || undefined
        })
      });
      setMessage("Randevu yaradıldı.");
      setNotes("");
      await loadData(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Randevu yaradıla bilmədi.");
    }
  }

  async function changeStatus(id: string, status: AppointmentStatus) {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setMessage(`Status dəyişdi: ${statusLabel[status]}`);
      await loadData(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status dəyişdirilə bilmədi.");
    }
  }

  const canCreate = role && ["SUPER_ADMIN", "ADMIN", "CALL_CENTER"].includes(role);

  return (
    <>
      <div className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Modul 02 · Qəbul axını</p>
          <h1>Təqvim və qəbullar</h1>
          <span>Gündəlik randevular, check-in, müalicəyə keçid və tamamlanma bir yerdə.</span>
        </div>
        <button className="ws-button" onClick={() => loadData(date)} disabled={loading}>
          Yenilə
        </button>
      </div>

      {message ? <div className="ws-alert ws-alert--success">{message}</div> : null}
      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>AKTİV RANDEVU</span>
          <small>Gözləyən və prosesdə olanlar</small>
          <strong>{stats.active}</strong>
        </article>
        <article>
          <span>KLİNİKADA</span>
          <small>Check-in və müalicədə</small>
          <strong>{stats.checkedIn}</strong>
        </article>
        <article>
          <span>TAMAMLANAN</span>
          <small>Bugünkü bitmiş qəbullar</small>
          <strong>{stats.completed}</strong>
        </article>
      </section>

      <section className="ws-panel" style={{ marginBottom: 22, padding: 16 }}>
        <p className="ws-eyebrow">Həftəlik təqvim</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {Object.entries(weekCounts).map(([dayKey, count]) => (
            <button
              key={dayKey}
              type="button"
              className={`ws-button${dayKey === date ? " ws-button--primary" : ""}`}
              onClick={() => {
                setDate(dayKey);
                void loadData(dayKey);
              }}
            >
              {day(dayKey + "T12:00:00")}
              <br />
              <small>{count} randevu</small>
            </button>
          ))}
        </div>
      </section>

      <div className="ws-scheduler-grid">
        <section className="ws-panel ws-today">
          <header>
            <div>
              <p className="ws-eyebrow">Günlük cədvəl</p>
              <h2>{day(`${date}T12:00:00`)}</h2>
            </div>
            <label className="ws-date-filter">
              Tarix
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  loadData(event.target.value);
                }}
              />
            </label>
          </header>

          {loading ? (
            <div className="ws-empty">
              <b>Yüklənir...</b>
              <span>Randevu siyahısı hazırlanır.</span>
            </div>
          ) : selectedDayAppointments.length === 0 ? (
            <div className="ws-empty">
              <b>Bu gün üçün randevu yoxdur</b>
              <span>Yeni qəbul yaratmaq üçün sağdakı formadan istifadə et.</span>
            </div>
          ) : (
            <div className="ws-flow-list">
              {selectedDayAppointments.map((appointment) => (
                <article className="ws-flow-card" key={appointment.id}>
                  <time>
                    {hour(appointment.startsAt)}–{hour(appointment.endsAt)}
                  </time>
                  <div>
                    <b>{appointment.patientName}</b>
                    <span>
                      {appointment.patientPhone} · {appointment.identityNumber}
                    </span>
                    <small>
                      {appointment.doctorName} · {appointment.branch}
                      {appointment.roomNumber ? ` · otaq ${appointment.roomNumber}` : ""}
                    </small>
                  </div>
                  <em data-status={appointment.status}>{statusLabel[appointment.status]}</em>
                  <footer>
                    <Link href={`/patients/card?id=${appointment.patientId}`}>Kart</Link>
                    {(nextStatus[appointment.status] ?? []).map((status) => (
                      <button key={status} onClick={() => changeStatus(appointment.id, status)}>
                        {statusLabel[status]}
                      </button>
                    ))}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="ws-panel ws-booking">
          <p className="ws-eyebrow">Yeni qəbul</p>
          <h2>Randevu yarat</h2>
          {canCreate ? (
            <form className="ws-form-grid" onSubmit={createAppointment}>
              <label className="ws-form-wide">
                Pasiyent
                <select value={patientId} onChange={(event) => setPatientId(event.target.value)} required>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} · {patient.phone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ws-form-wide">
                Həkim
                <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required>
                  {activeDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.fullName} · {doctor.branch}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Başlama
                <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
              </label>
              <label>
                Müddət
                <select value={duration} onChange={(event) => setDuration(event.target.value)}>
                  <option value="15">15 dəqiqə</option>
                  <option value="30">30 dəqiqə</option>
                  <option value="45">45 dəqiqə</option>
                  <option value="60">60 dəqiqə</option>
                </select>
              </label>
              <label className="ws-form-wide">
                Qeyd
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Məs: ilkin baxış, ağrı, kontrol..." />
              </label>
              <footer className="ws-form-wide">
                <button className="ws-button ws-button--primary" type="submit">
                  Randevu yarat
                </button>
              </footer>
            </form>
          ) : (
            <div className="ws-empty">
              <b>Yaratma icazəsi yoxdur</b>
              <span>Bu rol yalnız mövcud qəbul axınını görə bilər.</span>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
