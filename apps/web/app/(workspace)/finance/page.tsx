"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest, openAuthenticatedHtml } from "../../../lib/lovelydent-api";

type FinanceSummary = {
  todayCharges: number;
  todayPayments: number;
  todayCashPayments: number;
  openDebtors: number;
  totalOutstanding: number;
  openSession: {
    id: string;
    openingBalance: number;
    expectedBalance: number | null;
    openedAt: string;
    openedBy: string;
  } | null;
};

type Debtor = {
  patientId: string;
  patientName: string;
  phone: string;
  balance: number;
};

type Patient = { id: string; firstName: string; lastName: string; phone: string };
type RefundablePayment = {
  entryId: string;
  receiptNumber: string | null;
  paymentMethod: string | null;
  amount: number;
  refundableAmount: number;
  createdAt: string;
};

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="ws-empty"><b>Maliyyə yüklənir...</b></div>}>
      <FinanceWorkspace />
    </Suspense>
  );
}

function FinanceWorkspace() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [refundablePayments, setRefundablePayments] = useState<RefundablePayment[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [openBalance, setOpenBalance] = useState("0");
  const [closeBalance, setCloseBalance] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    patientId: "",
    amount: "",
    paymentMethod: "CASH" as "CASH" | "CARD" | "TRANSFER",
    description: "Klinika ödənişi",
  });
  const [depositForm, setDepositForm] = useState({
    patientId: "",
    amount: "",
    paymentMethod: "CASH" as "CASH" | "CARD" | "TRANSFER",
  });
  const [refundForm, setRefundForm] = useState({ patientId: "", referencePaymentId: "", amount: "", description: "Geri qaytarma" });
  const [periodDate, setPeriodDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lastReceiptEntryId, setLastReceiptEntryId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const sessionOpen = Boolean(summary?.openSession);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [financeSummary, debtorRows, patientRows] = await Promise.all([
        apiRequest<FinanceSummary>("/finance/summary"),
        apiRequest<Debtor[]>("/finance/debtors?take=20"),
        apiRequest<Patient[]>("/patients?take=100"),
      ]);
      setSummary(financeSummary);
      setDebtors(debtorRows);
      setPatients(patientRows);
      if (!paymentForm.patientId && debtorRows[0]) {
        setPaymentForm((value) => ({ ...value, patientId: debtorRows[0].patientId }));
      }
      if (!refundForm.patientId && patientRows[0]) {
        setRefundForm((value) => ({ ...value, patientId: patientRows[0].id }));
      }
      if (financeSummary.openSession) {
        setCloseBalance(String(financeSummary.openSession.expectedBalance ?? 0));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Maliyyə məlumatları yüklənmədi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const patientId = searchParams?.get("patientId");
    if (patientId) {
      setPaymentForm((value) => ({ ...value, patientId }));
      setDepositForm((value) => ({ ...value, patientId }));
      setRefundForm((value) => ({ ...value, patientId }));
    }
  }, [searchParams]);

  async function openSession(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await apiRequest("/finance/cash-sessions/open", {
        method: "POST",
        body: JSON.stringify({ openingBalance: Number(openBalance) }),
      });
      setNotice("Kassa növbəsi açıldı.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kassa açılmadı.");
    }
  }

  async function closeSession(event: FormEvent) {
    event.preventDefault();
    if (!summary?.openSession) return;
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ variance: number }>(`/finance/cash-sessions/${summary.openSession.id}/close`, {
        method: "POST",
        body: JSON.stringify({ countedBalance: Number(closeBalance) }),
      });
      setNotice(`Kassa bağlandı. Fərq: ${result.variance.toFixed(2)} AZN`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kassa bağlanmadı.");
    }
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ receiptNumber: string; balance: number; entryId: string }>("/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          ...paymentForm,
          amount: Number(paymentForm.amount),
        }),
      });
      setNotice(`Ödəniş qəbul edildi. Qəbz: ${result.receiptNumber}. Qalıq borc: ${result.balance.toFixed(2)} AZN`);
      setLastReceiptEntryId(result.entryId);
      setPaymentForm((value) => ({ ...value, amount: "" }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ödəniş qeydə alınmadı.");
    }
  }

  async function submitDeposit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ receiptNumber: string }>("/finance/deposits", {
        method: "POST",
        body: JSON.stringify({ ...depositForm, amount: Number(depositForm.amount) }),
      });
      setNotice(`Depozit qeydə alındı: ${result.receiptNumber}`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Depozit qeydə alınmadı.");
    }
  }

  async function submitRefund(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ message?: string; receiptNumber?: string }>("/finance/refunds", {
        method: "POST",
        body: JSON.stringify({ ...refundForm, amount: Number(refundForm.amount) }),
      });
      setNotice(result.message ?? `Refund qeydə alındı${result.receiptNumber ? `: ${result.receiptNumber}` : ""}.`);
      setRefundForm((value) => ({ ...value, referencePaymentId: "", amount: "" }));
      await load();
      await refreshRefundablePayments(refundForm.patientId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refund qeydə alınmadı.");
    }
  }

  async function refreshRefundablePayments(patientId: string) {
    if (!patientId) {
      setRefundablePayments([]);
      return;
    }
    const rows = await apiRequest<RefundablePayment[]>(`/finance/payments/refundable?patientId=${encodeURIComponent(patientId)}`);
    setRefundablePayments(rows);
    if (!rows.some((row) => row.entryId === refundForm.referencePaymentId)) {
      setRefundForm((value) => ({
        ...value,
        referencePaymentId: rows[0]?.entryId ?? "",
        amount: rows[0] ? String(rows[0].refundableAmount) : "",
      }));
    }
  }

  useEffect(() => {
    void refreshRefundablePayments(refundForm.patientId)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Qəbzlər yüklənmədi."));
  }, [refundForm.patientId]);

  async function closePeriod(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await apiRequest("/finance/periods/close", {
        method: "POST",
        body: JSON.stringify({ closedThrough: periodDate }),
      });
      setNotice(`Maliyyə periodu bağlandı: ${periodDate}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Period bağlanmadı.");
    }
  }

  const selectedDebtor = useMemo(
    () => debtors.find((row) => row.patientId === paymentForm.patientId),
    [debtors, paymentForm.patientId],
  );

  return (
    <>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">Maliyyə · Faza 1B</p>
          <h1>Kassa və pasiyent hesabı</h1>
          <span>
            Borc və ödənişlər server ledger-indən avtomatik hesablanır. Nağd ödəniş üçün açıq kassa
            növbəsi tələb olunur.
          </span>
        </div>
        <button type="button" className="ws-button" onClick={() => void load()} disabled={loading}>
          Yenilə
        </button>
      </section>

      {error && <div className="ws-alert ws-alert--danger">{error}</div>}
      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}
      {lastReceiptEntryId && (
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="ws-button"
            onClick={() => void openAuthenticatedHtml(`/finance/receipts/${lastReceiptEntryId}`)}
          >
            Son qəbzi çap et
          </button>
        </div>
      )}

      <section className="ws-metrics">
        <article>
          <span>BUGÜNKÜ BORCLAR</span>
          <strong>{summary ? `${summary.todayCharges.toFixed(2)} ₼` : "—"}</strong>
          <small>Server hesablanmış xidmət haqqı</small>
        </article>
        <article>
          <span>BUGÜNKÜ ÖDƏNİŞ</span>
          <strong>{summary ? `${summary.todayPayments.toFixed(2)} ₼` : "—"}</strong>
          <small>Nağd: {summary ? `${summary.todayCashPayments.toFixed(2)} ₼` : "—"}</small>
        </article>
        <article>
          <span>ÜMUMİ BORCLU</span>
          <strong>{summary ? summary.openDebtors : "—"}</strong>
          <small>Cəmi: {summary ? `${summary.totalOutstanding.toFixed(2)} ₼` : "—"}</small>
        </article>
      </section>

      <div className="ws-clinical-grid">
        <section className="ws-panel ws-today">
          <header>
            <div>
              <p className="ws-eyebrow">Borclu pasiyentlər</p>
              <h2>Ödəniş gözləyənlər</h2>
            </div>
          </header>
          {debtors.length ? (
            <div className="ws-flow-list">
              {debtors.map((row) => (
                <article className="ws-flow-card" key={row.patientId}>
                  <time>{row.balance.toFixed(2)} ₼</time>
                  <div>
                    <b>{row.patientName}</b>
                    <span>{row.phone}</span>
                  </div>
                  <button
                    type="button"
                    className="ws-row-action"
                    onClick={() => setPaymentForm((value) => ({ ...value, patientId: row.patientId, amount: String(row.balance) }))}
                  >
                    Ödəniş al
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="ws-empty">
              <b>Borclu pasiyent yoxdur</b>
              <span>Xidmət tamamlandıqca borc avtomatik burada görünəcək.</span>
            </div>
          )}
        </section>

        <aside className="ws-panel ws-booking">
          <p className="ws-eyebrow">Kassa növbəsi</p>
          <h2>{sessionOpen ? "Açıq növbə" : "Növbə bağlıdır"}</h2>
          {summary?.openSession ? (
            <div className="ws-clinical-note">
              <p>Açılış: {summary.openSession.openingBalance.toFixed(2)} ₼</p>
              <p>Gözlənilən: {(summary.openSession.expectedBalance ?? 0).toFixed(2)} ₼</p>
              <p>Açıldı: {new Date(summary.openSession.openedAt).toLocaleString("az-AZ")}</p>
            </div>
          ) : null}

          {!sessionOpen ? (
            <form className="ws-form-grid" onSubmit={openSession}>
              <label>
                Açılış qalığı (AZN)
                <input type="number" min="0" step="0.01" value={openBalance} onChange={(e) => setOpenBalance(e.target.value)} />
              </label>
              <footer className="ws-form-wide">
                <button type="submit" className="ws-button ws-button--primary">
                  Kassanı aç
                </button>
              </footer>
            </form>
          ) : (
            <form className="ws-form-grid" onSubmit={closeSession}>
              <label>
                Sayılmış qalıq (AZN)
                <input type="number" min="0" step="0.01" required value={closeBalance} onChange={(e) => setCloseBalance(e.target.value)} />
              </label>
              <footer className="ws-form-wide">
                <button type="submit" className="ws-button ws-button--primary">
                  Gün sonu bağla
                </button>
              </footer>
            </form>
          )}

          <hr style={{ margin: "24px 0", border: 0, borderTop: "1px solid var(--ws-line)" }} />

          <p className="ws-eyebrow">Ödəniş qəbulu</p>
          <form className="ws-form-grid" onSubmit={submitPayment}>
            <label className="ws-form-wide">
              Pasiyent
              <select required value={paymentForm.patientId} onChange={(e) => setPaymentForm({ ...paymentForm, patientId: e.target.value })}>
                <option value="">Seçin</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </label>
            {selectedDebtor && <small className="ws-form-wide">Cari borc: {selectedDebtor.balance.toFixed(2)} ₼</small>}
            <label>
              Məbləğ (AZN)
              <input type="number" min="0.01" step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </label>
            <label>
              Metod
              <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as "CASH" | "CARD" | "TRANSFER" })}>
                <option value="CASH">Nağd</option>
                <option value="CARD">Kart</option>
                <option value="TRANSFER">Köçürmə</option>
              </select>
            </label>
            <footer className="ws-form-wide">
              <button type="submit" className="ws-button ws-button--primary" disabled={paymentForm.paymentMethod === "CASH" && !sessionOpen}>
                Ödənişi qeydə al
              </button>
            </footer>
          </form>
        </aside>
      </div>

      <div className="ws-dashboard-grid" style={{ marginTop: 22 }}>
        <section className="ws-panel pc-section">
          <p className="ws-eyebrow">Depozit</p>
          <h2>Əvvəlcədən ödəniş</h2>
          <form className="ws-form-grid" style={{ padding: 20 }} onSubmit={submitDeposit}>
            <label className="ws-form-wide">
              Pasiyent
              <select required value={depositForm.patientId} onChange={(e) => setDepositForm({ ...depositForm, patientId: e.target.value })}>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>
                ))}
              </select>
            </label>
            <label>
              Məbləğ
              <input type="number" min="0.01" step="0.01" required value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} />
            </label>
            <label>
              Metod
              <select value={depositForm.paymentMethod} onChange={(e) => setDepositForm({ ...depositForm, paymentMethod: e.target.value as "CASH" | "CARD" | "TRANSFER" })}>
                <option value="CASH">Nağd</option>
                <option value="CARD">Kart</option>
                <option value="TRANSFER">Köçürmə</option>
              </select>
            </label>
            <footer className="ws-form-wide">
              <button type="submit" className="ws-button ws-button--primary">Depozit yaz</button>
            </footer>
          </form>
        </section>
        <section className="ws-panel pc-section">
          <p className="ws-eyebrow">Refund</p>
          <h2>Geri qaytarma</h2>
          <form className="ws-form-grid" style={{ padding: 20 }} onSubmit={submitRefund}>
            <label className="ws-form-wide">
              Pasiyent
              <select required value={refundForm.patientId} onChange={(e) => setRefundForm({ ...refundForm, patientId: e.target.value })}>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>
                ))}
              </select>
            </label>
            <label className="ws-form-wide">
              Qaytarılacaq qəbz
              <select
                required
                value={refundForm.referencePaymentId}
                onChange={(e) => {
                  const payment = refundablePayments.find((row) => row.entryId === e.target.value);
                  setRefundForm({ ...refundForm, referencePaymentId: e.target.value, amount: payment ? String(payment.refundableAmount) : "" });
                }}
              >
                <option value="">Qəbz seçin</option>
                {refundablePayments.map((payment) => (
                  <option key={payment.entryId} value={payment.entryId}>
                    {payment.receiptNumber ?? payment.entryId} · {new Date(payment.createdAt).toLocaleDateString("az-AZ")} · qalıq {payment.refundableAmount.toFixed(2)} ₼
                  </option>
                ))}
              </select>
            </label>
            <label>
              Məbləğ
              <input type="number" min="0.01" step="0.01" required value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} />
            </label>
            <label className="ws-form-wide">
              Səbəb
              <input required value={refundForm.description} onChange={(e) => setRefundForm({ ...refundForm, description: e.target.value })} />
            </label>
            <footer className="ws-form-wide">
              <button type="submit" className="ws-button ws-button--primary">Refund et</button>
            </footer>
          </form>
        </section>
        <section className="ws-panel pc-section">
          <p className="ws-eyebrow">Period</p>
          <h2>Gün sonu bağlanması</h2>
          <form className="ws-form-grid" style={{ padding: 20 }} onSubmit={closePeriod}>
            <label>
              Bağlanacaq gün
              <input type="date" required value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
            </label>
            <footer className="ws-form-wide">
              <button type="submit" className="ws-button ws-button--primary">Periodu bağla</button>
            </footer>
          </form>
        </section>
      </div>
    </>
  );
}
