"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest, CurrentUser, roleLabel } from "../../../lib/lovelydent-api";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type Assignee = { id: string; email: string; role: CurrentUser["role"]; active: boolean };
type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: TaskStatus;
  priority: Priority;
  active: boolean;
  isOverdue: boolean;
  assignee: Assignee;
  createdBy: Assignee;
};

const statusLabel: Record<TaskStatus, string> = {
  PENDING: "Gözləyir",
  IN_PROGRESS: "İcradadır",
  COMPLETED: "Tamamlandı",
  CANCELLED: "Ləğv edildi",
};
const priorityLabel: Record<Priority, string> = { LOW: "Aşağı", MEDIUM: "Normal", HIGH: "Təcili" };
const defaultForm = { title: "", description: "", assigneeUserId: "", dueDate: "", priority: "MEDIUM" as Priority };

export default function TasksPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [statusFilter, setStatusFilter] = useState<"" | TaskStatus>("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canManage = user ? ["SUPER_ADMIN", "ADMIN"].includes(user.role) : false;

  async function load() {
    const currentUser = await apiRequest<CurrentUser>("/auth/me");
    setUser(currentUser);
    const query = statusFilter ? `?status=${statusFilter}&take=120` : "?take=120";
    const requests: Promise<unknown>[] = [apiRequest<Task[]>(`/tasks${query}`)];
    if (["SUPER_ADMIN", "ADMIN"].includes(currentUser.role)) requests.push(apiRequest<Assignee[]>("/tasks/assignees"));
    const [taskRows, assigneeRows] = await Promise.all(requests);
    setTasks(taskRows as Task[]);
    setAssignees((assigneeRows as Assignee[] | undefined) ?? []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Tapşırıqlar yüklənmədi."));
  }, [statusFilter]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!form.title.trim() || !form.assigneeUserId || !form.dueDate) {
      setError("Tapşırıq üçün başlıq, məsul və son tarix tələb olunur.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          description: form.description || undefined,
          dueDate: new Date(form.dueDate).toISOString(),
        }),
      });
      setForm(defaultForm);
      setNotice("Tapşırıq yaradıldı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tapşırıq yaradılmadı.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: TaskStatus) {
    setError("");
    try {
      await apiRequest(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tapşırıq yenilənmədi.");
    }
  }

  return (
    <div>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">İş bölgüsü</p>
          <h1>Tapşırıqlar</h1>
          <span>Super admin və admin işçilərə tapşırıq verir; əməkdaşlar öz iş siyahısını izləyir.</span>
        </div>
      </section>

      {notice ? <div className="ws-alert ws-alert--success">{notice}</div> : null}
      {error ? <div className="ws-alert ws-alert--danger">{error}</div> : null}

      <section className="ws-metrics">
        <article>
          <span>Açıq tapşırıq</span>
          <strong>{tasks.filter((task) => ["PENDING", "IN_PROGRESS"].includes(task.status)).length}</strong>
          <small>Aktiv iş yükü</small>
        </article>
        <article>
          <span>Gecikən</span>
          <strong>{tasks.filter((task) => task.isOverdue).length}</strong>
          <small>Son tarixi keçmiş işlər</small>
        </article>
        <article>
          <span>Təcili</span>
          <strong>{tasks.filter((task) => task.priority === "HIGH" && task.status !== "COMPLETED").length}</strong>
          <small>Prioritetli tapşırıqlar</small>
        </article>
      </section>

      <section className="pc-grid">
        {canManage ? (
          <form className="ws-panel pc-form" onSubmit={createTask}>
            <header>
              <div>
                <p className="ws-eyebrow">Yeni tapşırıq</p>
                <h2>İşçiyə tapşırıq ver</h2>
              </div>
            </header>
            <div className="ws-form-grid">
              <label className="ws-form-wide">
                Başlıq
                <input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
              </label>
              <label>
                Məsul
                <select value={form.assigneeUserId} onChange={(e) => setForm((v) => ({ ...v, assigneeUserId: e.target.value }))}>
                  <option value="">İşçi seçin</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.email} · {roleLabel[assignee.role]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Son tarix
                <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((v) => ({ ...v, dueDate: e.target.value }))} />
              </label>
              <label>
                Prioritet
                <select value={form.priority} onChange={(e) => setForm((v) => ({ ...v, priority: e.target.value as Priority }))}>
                  <option value="LOW">Aşağı</option>
                  <option value="MEDIUM">Normal</option>
                  <option value="HIGH">Təcili</option>
                </select>
              </label>
              <label className="ws-form-wide">
                İzah
                <textarea value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
              </label>
              <footer className="ws-form-wide">
                <button className="ws-button ws-button--primary" disabled={saving}>
                  Tapşırığı yarat
                </button>
              </footer>
            </div>
          </form>
        ) : null}

        <section className="ws-panel pc-section">
          <header className="ws-registry-tools">
            <div>
              <p className="ws-eyebrow">İş siyahısı</p>
              <h2>{canManage ? "Bütün tapşırıqlar" : "Mənim tapşırıqlarım"}</h2>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | TaskStatus)}>
              <option value="">Hamısı</option>
              <option value="PENDING">Gözləyir</option>
              <option value="IN_PROGRESS">İcradadır</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="CANCELLED">Ləğv edildi</option>
            </select>
          </header>
          <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
            {tasks.map((task) => (
              <article className="ws-flow-card" key={task.id}>
                <time>{new Date(task.dueDate).toLocaleString("az-AZ")}</time>
                <div>
                  <b>{task.title}</b>
                  <span>{task.assignee.email} · {priorityLabel[task.priority]} · {statusLabel[task.status]}</span>
                  <small>{task.description || "İzah yoxdur."}</small>
                </div>
                <em data-status={task.isOverdue ? "CANCELED" : task.status}>{task.isOverdue ? "Gecikir" : statusLabel[task.status]}</em>
                <footer>
                  {task.status === "PENDING" ? <button type="button" onClick={() => void updateStatus(task.id, "IN_PROGRESS")}>Başla</button> : null}
                  {task.status !== "COMPLETED" ? <button type="button" onClick={() => void updateStatus(task.id, "COMPLETED")}>Tamamla</button> : null}
                  {task.status !== "CANCELLED" ? <button type="button" onClick={() => void updateStatus(task.id, "CANCELLED")}>Ləğv et</button> : null}
                </footer>
              </article>
            ))}
            {!tasks.length ? <div className="ws-empty"><span>Tapşırıq yoxdur.</span></div> : null}
          </div>
        </section>
      </section>
    </div>
  );
}
