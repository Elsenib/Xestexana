"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiRequest, downloadAuthenticatedFile, openAuthenticatedHtml } from "../../../../lib/lovelydent-api";

type Anamnesis = {
  version: number;
  allergies: string[];
  chronicConditions: string[];
  infectiousDiseases: string[];
  regularMedications: string[];
  pregnancyOrRisk?: string;
  pastSurgeries?: string;
  medicalNotes?: string;
  criticalAlert?: string;
  confirmedByPatient: boolean;
  createdAt: string;
};
type ToothEntry = {
  tooth: string;
  surfaces: string[];
  condition: string;
  phase: "EXISTING" | "PLANNED";
};
type Summary = {
  id: string;
  firstName: string;
  lastName: string;
  identityNumber: string;
  phone: string;
  gender: string;
  birthDate: string;
  bloodType?: string;
  anamnesisVersions: Anamnesis[];
  odontogramSnapshots: Array<{
    id: string;
    entries: ToothEntry[];
    createdAt: string;
  }>;
  clinicalEncounters: Array<{
    id: string;
    status: string;
    diagnosis?: string;
    createdAt: string;
    doctor: { email: string };
  }>;
};
const upper = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];
const lower = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];
const conditions = [
  "HEALTHY",
  "CARIES",
  "FILLING",
  "ROOT_CANAL",
  "CROWN",
  "IMPLANT",
  "EXTRACTED",
  "MISSING",
];
const labels: Record<string, string> = {
  HEALTHY: "Sağlam",
  CARIES: "Kariyes",
  FILLING: "Plomb",
  ROOT_CANAL: "Kanal",
  CROWN: "Kron",
  IMPLANT: "İmplant",
  EXTRACTED: "Çəkilib",
  MISSING: "Çatışmır",
};

const emptyEncounter = {
  complaint: "",
  examination: "",
  diagnosis: "",
  clinicalNotes: "",
  recommendations: "",
  prescription: "",
  nextVisitAt: "",
};

const encounterStatus: Record<string, string> = {
  DRAFT: "Qaralama",
  COMPLETED: "Tamamlandı",
};

type Service = { id: string; name: string; price: number; code: string };
type ChargeLine = { serviceId: string; description: string; quantity: number };
type AccountEntry = {
  id: string;
  entryType: string;
  direction: string;
  amount: number;
  description: string;
  receiptNumber: string | null;
  createdAt: string;
  createdBy: string;
};
type PatientFileRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  createdAt: string;
  uploadedBy: string;
};

function buildCharges(lines: ChargeLine[], services: Service[]) {
  return lines
    .filter((line) => line.serviceId || line.description.trim())
    .map((line) => {
      const service = services.find((item) => item.id === line.serviceId);
      return {
        serviceId: line.serviceId || undefined,
        description: line.description.trim() || service?.name || "Klinika xidməti",
        quantity: line.quantity,
        amount: line.serviceId ? undefined : undefined,
      };
    });
}

async function postComplete(encounterId: string, charges: ReturnType<typeof buildCharges>) {
  const response = await apiRequest<{ message?: string; approvalId?: string; status?: string }>(
    `/clinical-encounters/${encounterId}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ charges: charges.length ? charges : undefined }),
    },
  );
  return response;
}

function ClinicalCard() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? null;
  const [data, setData] = useState<Summary | null>(null);
  const [tab, setTab] = useState("summary");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [encounter, setEncounter] = useState(emptyEncounter);
  const [anamnesis, setAnamnesis] = useState({
    allergies: "",
    chronicConditions: "",
    infectiousDiseases: "",
    regularMedications: "",
    pregnancyOrRisk: "",
    pastSurgeries: "",
    medicalNotes: "",
    criticalAlert: "",
    confirmedByPatient: false,
  });
  const [teeth, setTeeth] = useState<Record<string, ToothEntry>>({});
  const [selected, setSelected] = useState("11");
  const [phase, setPhase] = useState<"EXISTING" | "PLANNED">("EXISTING");
  const [services, setServices] = useState<Service[]>([]);
  const [chargeLines, setChargeLines] = useState<ChargeLine[]>([
    { serviceId: "", description: "", quantity: 1 },
  ]);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>([]);
  const [files, setFiles] = useState<PatientFileRow[]>([]);
  const [uploadCategory, setUploadCategory] = useState("XRAY");
  async function load() {
    if (!id) return;
    try {
      const value = await apiRequest<Summary>(
        `/patients/${id}/clinical-summary`,
      );
      setData(value);
      const latest = value.anamnesisVersions[0];
      if (latest)
        setAnamnesis({
          allergies: latest.allergies.join(", "),
          chronicConditions: latest.chronicConditions.join(", "),
          infectiousDiseases: latest.infectiousDiseases.join(", "),
          regularMedications: latest.regularMedications.join(", "),
          pregnancyOrRisk: latest.pregnancyOrRisk ?? "",
          pastSurgeries: latest.pastSurgeries ?? "",
          medicalNotes: latest.medicalNotes ?? "",
          criticalAlert: latest.criticalAlert ?? "",
          confirmedByPatient: latest.confirmedByPatient,
        });
      const latestChart = value.odontogramSnapshots[0];
      if (latestChart)
        setTeeth(
          Object.fromEntries(latestChart.entries.map((x) => [x.tooth, x])),
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Klinik kart yüklənmədi.");
    }
  }
  useEffect(() => {
    void load();
    void apiRequest<Service[]>("/services")
      .then(setServices)
      .catch(() => undefined);
  }, [id]);

  async function loadAccount() {
    if (!id) return;
    const data = await apiRequest<{ balance: number; entries: AccountEntry[] }>(
      `/finance/patients/${id}/account`,
    );
    setAccountBalance(data.balance);
    setAccountEntries(data.entries);
  }

  async function loadFiles() {
    if (!id) return;
    setFiles(await apiRequest<PatientFileRow[]>(`/patients/${id}/files`));
  }

  useEffect(() => {
    if (tab === "finance") void loadAccount().catch(() => undefined);
    if (tab === "files") void loadFiles().catch(() => undefined);
  }, [tab, id]);
  const list = (value: string) =>
    value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  async function saveAnamnesis(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await apiRequest(`/patients/${id}/anamnesis`, {
        method: "POST",
        body: JSON.stringify({
          ...anamnesis,
          allergies: list(anamnesis.allergies),
          chronicConditions: list(anamnesis.chronicConditions),
          infectiousDiseases: list(anamnesis.infectiousDiseases),
          regularMedications: list(anamnesis.regularMedications),
        }),
      });
      await load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Anamnez saxlanmadı.");
    }
  }
  function setCondition(condition: string) {
    setTeeth({
      ...teeth,
      [selected]: { tooth: selected, surfaces: ["WHOLE"], condition, phase },
    });
  }
  async function saveChart() {
    if (!id) return;
    try {
      await apiRequest(`/patients/${id}/odontograms`, {
        method: "POST",
        body: JSON.stringify({
          numberingSystem: "FDI",
          dentition: "PERMANENT",
          entries: Object.values(teeth),
        }),
      });
      await load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Odontogram saxlanmadı.");
    }
  }
  async function saveEncounter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldComplete = submitter?.value === "complete";
    setError("");
    setNotice("");
    setSavingEncounter(true);
    try {
      const created = await apiRequest<{ id: string }>("/clinical-encounters", {
        method: "POST",
        body: JSON.stringify({
          patientId: id,
          ...encounter,
          nextVisitAt: encounter.nextVisitAt
            ? new Date(encounter.nextVisitAt).toISOString()
            : null,
        }),
      });
      if (shouldComplete) {
        const charges = buildCharges(chargeLines, services);
        const result = await postComplete(created.id, charges);
        if (result.approvalId) {
          setNotice("Qəbul həkim təsdiqi gözləyir.");
        } else {
          setNotice("Klinik qəbul tamamlandı və borc yazıldı.");
        }
      } else {
        setNotice("Klinik qəbul qaralama kimi saxlanıldı.");
      }
      setEncounter(emptyEncounter);
      setChargeLines([{ serviceId: "", description: "", quantity: 1 }]);
      await load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Klinik qəbul saxlanmadı.");
    } finally {
      setSavingEncounter(false);
    }
  }
  async function completeEncounter(encounterId: string) {
    setError("");
    setNotice("");
    try {
      const charges = buildCharges(chargeLines, services);
      const result = await postComplete(encounterId, charges);
      if (result.approvalId) {
        setNotice("Qəbul həkim təsdiqi gözləyir.");
      } else {
        setNotice("Klinik qəbul tamamlandı.");
      }
      await load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Klinik qəbul tamamlanmadı.");
    }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Fayl 5 MB-dan böyük ola bilməz.");
      return;
    }
    setError("");
    setNotice("");
    const buffer = await file.arrayBuffer();
    const contentBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    try {
      await apiRequest(`/patients/${id}/files`, {
        method: "POST",
        body: JSON.stringify({
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          category: uploadCategory,
          contentBase64,
        }),
      });
      setNotice("Fayl yükləndi.");
      input.value = "";
      await loadFiles();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Fayl yüklənmədi.");
    }
  }
  if (!id)
    return (
      <section className="ws-coming">
        <h1>Pasiyent seçilməyib</h1>
        <a href="/patients">Pasiyentlərə qayıt</a>
      </section>
    );
  if (!data)
    return (
      <div className="ws-empty">
        <b>{error || "Klinik kart yüklənir..."}</b>
      </div>
    );
  const latest = data.anamnesisVersions[0];
  const age = Math.floor(
    (Date.now() - new Date(data.birthDate).getTime()) / 31557600000,
  );
  return (
    <>
      <section className="pc-head">
        <a href="/patients">← Pasiyentlər</a>
        <div className="pc-identity">
          <i>
            {data.firstName[0]}
            {data.lastName[0]}
          </i>
          <div>
            <p className="ws-eyebrow">Pasiyent #{data.identityNumber}</p>
            <h1>
              {data.firstName} {data.lastName}
            </h1>
            <span>
              {age} yaş · {data.phone} ·{" "}
              {data.bloodType || "Qan qrupu qeyd edilməyib"}
            </span>
          </div>
        </div>
        {latest?.criticalAlert && (
          <div className="pc-critical">
            <b>KRİTİK XƏBƏRDARLIQ</b>
            <span>{latest.criticalAlert}</span>
          </div>
        )}
      </section>
      <nav className="pc-tabs">
        {[
          ["summary", "Ümumi baxış"],
          ["anamnesis", "Anamnez"],
          ["odontogram", "Odontogram"],
          ["encounters", "Klinik qəbullar"],
          ["finance", "Hesab"],
          ["files", "Fayllar"],
        ].map((x) => (
          <button
            className={tab === x[0] ? "active" : ""}
            onClick={() => setTab(x[0])}
            key={x[0]}
          >
            {x[1]}
          </button>
        ))}
      </nav>
      {error && <div className="ws-alert ws-alert--danger">{error}</div>}
      {notice && <div className="ws-alert ws-alert--success">{notice}</div>}
      {tab === "summary" && (
        <section className="pc-grid">
          <article className="ws-panel pc-section">
            <p className="ws-eyebrow">Tibbi təhlükəsizlik</p>
            <h2>Anamnez xülasəsi</h2>
            <dl>
              <div>
                <dt>Allergiyalar</dt>
                <dd>{latest?.allergies.join(", ") || "Qeyd yoxdur"}</dd>
              </div>
              <div>
                <dt>Xroniki xəstəliklər</dt>
                <dd>{latest?.chronicConditions.join(", ") || "Qeyd yoxdur"}</dd>
              </div>
              <div>
                <dt>Daimi dərmanlar</dt>
                <dd>
                  {latest?.regularMedications.join(", ") || "Qeyd yoxdur"}
                </dd>
              </div>
            </dl>
            <button className="ws-button" onClick={() => setTab("anamnesis")}>
              Anamnezi yenilə
            </button>
          </article>
          <article className="ws-panel pc-section">
            <p className="ws-eyebrow">Tarixçə</p>
            <h2>Son klinik qəbullar</h2>
            {data.clinicalEncounters.length ? (
              data.clinicalEncounters.slice(0, 5).map((x) => (
                <div className="pc-history" key={x.id}>
                  <i />
                  <div>
                    <b>{x.diagnosis || "Diaqnoz daxil edilməyib"}</b>
                    <span>
                      {new Date(x.createdAt).toLocaleDateString("az-AZ")} ·{" "}
                      {x.doctor.email}
                    </span>
                  </div>
                  <em>{x.status}</em>
                </div>
              ))
            ) : (
              <div className="ws-empty">
                <span>Klinik qəbul yoxdur.</span>
              </div>
            )}
          </article>
        </section>
      )}
      {tab === "anamnesis" && (
        <form className="ws-panel pc-form" onSubmit={saveAnamnesis}>
          <header>
            <div>
              <p className="ws-eyebrow">Versiyalı tibbi məlumat</p>
              <h2>Anamnez</h2>
            </div>
            <span>
              {latest
                ? `Versiya ${latest.version} · ${new Date(latest.createdAt).toLocaleDateString("az-AZ")}`
                : "İlk qeyd"}
            </span>
          </header>
          <div className="ws-form-grid">
            <label>
              Allergiyalar
              <input
                value={anamnesis.allergies}
                onChange={(e) =>
                  setAnamnesis({ ...anamnesis, allergies: e.target.value })
                }
                placeholder="Vergüllə ayırın"
              />
            </label>
            <label>
              Xroniki xəstəliklər
              <input
                value={anamnesis.chronicConditions}
                onChange={(e) =>
                  setAnamnesis({
                    ...anamnesis,
                    chronicConditions: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Yoluxucu xəstəliklər
              <input
                value={anamnesis.infectiousDiseases}
                onChange={(e) =>
                  setAnamnesis({
                    ...anamnesis,
                    infectiousDiseases: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Daimi dərmanlar
              <input
                value={anamnesis.regularMedications}
                onChange={(e) =>
                  setAnamnesis({
                    ...anamnesis,
                    regularMedications: e.target.value,
                  })
                }
              />
            </label>
            <label className="ws-form-wide">
              Kritik xəbərdarlıq
              <input
                value={anamnesis.criticalAlert}
                onChange={(e) =>
                  setAnamnesis({ ...anamnesis, criticalAlert: e.target.value })
                }
              />
            </label>
            <label>
              Hamiləlik və digər risklər
              <textarea
                value={anamnesis.pregnancyOrRisk}
                onChange={(e) =>
                  setAnamnesis({
                    ...anamnesis,
                    pregnancyOrRisk: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Keçmiş əməliyyatlar
              <textarea
                value={anamnesis.pastSurgeries}
                onChange={(e) =>
                  setAnamnesis({ ...anamnesis, pastSurgeries: e.target.value })
                }
              />
            </label>
            <label className="ws-form-wide">
              Digər tibbi qeydlər
              <textarea
                value={anamnesis.medicalNotes}
                onChange={(e) =>
                  setAnamnesis({ ...anamnesis, medicalNotes: e.target.value })
                }
              />
            </label>
            <label className="pc-check ws-form-wide">
              <input
                type="checkbox"
                checked={anamnesis.confirmedByPatient}
                onChange={(e) =>
                  setAnamnesis({
                    ...anamnesis,
                    confirmedByPatient: e.target.checked,
                  })
                }
              />{" "}
              Məlumat pasiyent tərəfindən təsdiqlənib
            </label>
            <footer className="ws-form-wide">
              <button className="ws-button ws-button--primary">
                Yeni versiyanı saxla
              </button>
            </footer>
          </div>
        </form>
      )}
      {tab === "odontogram" && (
        <section className="ws-panel pc-odonto">
          <header>
            <div>
              <p className="ws-eyebrow">FDI · Daimi dişlər</p>
              <h2>Odontogram</h2>
            </div>
            <button
              className="ws-button ws-button--primary"
              onClick={saveChart}
            >
              Snapshot saxla
            </button>
          </header>
          <div className="pc-phase">
            <button
              className={phase === "EXISTING" ? "active" : ""}
              onClick={() => setPhase("EXISTING")}
            >
              Mövcud vəziyyət
            </button>
            <button
              className={phase === "PLANNED" ? "active planned" : ""}
              onClick={() => setPhase("PLANNED")}
            >
              Planlaşdırılan
            </button>
          </div>
          <div className="pc-jaw">
            {[upper, lower].map((jaw, i) => (
              <div className="pc-teeth" key={i}>
                {jaw.map((tooth) => (
                  <button
                    title={labels[teeth[tooth]?.condition] || "Sağlam"}
                    className={`${selected === tooth ? "selected" : ""} ${teeth[tooth]?.phase === "PLANNED" ? "planned" : ""} ${teeth[tooth]?.condition && teeth[tooth].condition !== "HEALTHY" ? "marked" : ""}`}
                    onClick={() => setSelected(tooth)}
                    key={tooth}
                  >
                    <span>♢</span>
                    <b>{tooth}</b>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <aside className="pc-condition">
            <div>
              <small>SEÇİLMİŞ DİŞ</small>
              <strong>{selected}</strong>
            </div>
            <div>
              {conditions.map((c) => (
                <button
                  className={teeth[selected]?.condition === c ? "active" : ""}
                  onClick={() => setCondition(c)}
                  key={c}
                >
                  {labels[c]}
                </button>
              ))}
            </div>
          </aside>
          <p className="pc-legend">
            <i /> Mövcud vəziyyət <i /> Planlaşdırılan müalicə · Hər saxlamada
            tarixçədə yeni snapshot yaranır.
          </p>
        </section>
      )}
      {tab === "encounters" && (
        <div className="pc-grid">
          <form className="ws-panel pc-form" onSubmit={saveEncounter}>
            <header>
              <div>
                <p className="ws-eyebrow">Yeni klinik qeyd</p>
                <h2>Klinik qəbul</h2>
              </div>
              <span>Həkim qeydi</span>
            </header>
            <div className="ws-form-grid">
              <label>
                Şikayət
                <textarea
                  value={encounter.complaint}
                  onChange={(e) => setEncounter({ ...encounter, complaint: e.target.value })}
                />
              </label>
              <label>
                Müayinə nəticəsi
                <textarea
                  value={encounter.examination}
                  onChange={(e) => setEncounter({ ...encounter, examination: e.target.value })}
                />
              </label>
              <label className="ws-form-wide">
                Diaqnoz
                <input
                  value={encounter.diagnosis}
                  onChange={(e) => setEncounter({ ...encounter, diagnosis: e.target.value })}
                  placeholder="Qəbulu tamamlamaq üçün diaqnoz vacibdir"
                />
              </label>
              <label className="ws-form-wide">
                Klinik qeyd
                <textarea
                  value={encounter.clinicalNotes}
                  onChange={(e) => setEncounter({ ...encounter, clinicalNotes: e.target.value })}
                />
              </label>
              <label>
                Tövsiyələr
                <textarea
                  value={encounter.recommendations}
                  onChange={(e) => setEncounter({ ...encounter, recommendations: e.target.value })}
                />
              </label>
              <label>
                Resept
                <textarea
                  value={encounter.prescription}
                  onChange={(e) => setEncounter({ ...encounter, prescription: e.target.value })}
                />
              </label>
              <label>
                Növbəti qəbul
                <input
                  type="datetime-local"
                  value={encounter.nextVisitAt}
                  onChange={(e) => setEncounter({ ...encounter, nextVisitAt: e.target.value })}
                />
              </label>
              <div className="ws-form-wide">
                <p className="ws-eyebrow">Tamamlanma zamanı xidmət/borc</p>
                {chargeLines.map((line, index) => (
                  <div className="ws-form-grid" key={index} style={{ marginBottom: 8 }}>
                    <label className="ws-form-wide">
                      Xidmət
                      <select
                        value={line.serviceId}
                        onChange={(e) => {
                          const next = [...chargeLines];
                          const service = services.find((item) => item.id === e.target.value);
                          next[index] = {
                            ...next[index],
                            serviceId: e.target.value,
                            description: service?.name ?? next[index].description,
                          };
                          setChargeLines(next);
                        }}
                      >
                        <option value="">Seçin</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} · {service.price} ₼
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Miqdar
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => {
                          const next = [...chargeLines];
                          next[index] = { ...next[index], quantity: Number(e.target.value) };
                          setChargeLines(next);
                        }}
                      />
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  className="ws-button"
                  onClick={() => setChargeLines([...chargeLines, { serviceId: "", description: "", quantity: 1 }])}
                >
                  + Xidmət sətri
                </button>
              </div>
              <footer className="ws-form-wide">
                <button className="ws-button" value="draft" disabled={savingEncounter}>
                  Qaralama saxla
                </button>
                <button
                  className="ws-button ws-button--primary"
                  value="complete"
                  disabled={savingEncounter || !encounter.diagnosis.trim()}
                >
                  {savingEncounter ? "Saxlanılır..." : "İmzala və tamamla"}
                </button>
              </footer>
            </div>
          </form>
          <section className="ws-panel pc-section">
            <p className="ws-eyebrow">Dəyişməz klinik tarixçə</p>
            <h2>Klinik qəbullar</h2>
            {data.clinicalEncounters.length ? data.clinicalEncounters.map((x) => (
              <div className="pc-history" key={x.id}>
                <i />
                <div>
                  <b>{x.diagnosis || "Qaralama klinik qeyd"}</b>
                  <span>
                    {new Date(x.createdAt).toLocaleString("az-AZ")} ·{" "}
                    {x.doctor.email}
                  </span>
                </div>
                <em>{encounterStatus[x.status] ?? x.status}</em>
                {x.status === "DRAFT" && x.diagnosis && (
                  <button className="ws-row-action" onClick={() => void completeEncounter(x.id)}>
                    Tamamla
                  </button>
                )}
              </div>
            )) : (
              <div className="ws-empty"><span>Klinik qəbul yoxdur.</span></div>
            )}
          </section>
        </div>
      )}
      {tab === "finance" && (
        <section className="ws-panel pc-section">
          <header className="ws-registry-tools">
            <div>
              <p className="ws-eyebrow">Pasiyent hesabı</p>
              <h2>Maliyyə ledger</h2>
            </div>
            <strong>{accountBalance !== null ? `${accountBalance.toFixed(2)} ₼` : "—"}</strong>
          </header>
          <div style={{ padding: "0 20px 12px" }}>
            <Link className="ws-button ws-button--primary" href={`/finance?patientId=${id}`}>
              Ödəniş al
            </Link>
          </div>
          {accountEntries.length ? (
            <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
              {accountEntries.map((row) => (
                <article className="ws-flow-card" key={row.id}>
                  <time>{new Date(row.createdAt).toLocaleString("az-AZ")}</time>
                  <div>
                    <b>{row.description}</b>
                    <span>
                      {row.entryType} · {row.direction === "DEBIT" ? "+" : "−"}
                      {row.amount.toFixed(2)} ₼ · {row.createdBy}
                    </span>
                  </div>
                  {row.receiptNumber && (
                    <button
                      type="button"
                      className="ws-row-action"
                      onClick={() => void openAuthenticatedHtml(`/finance/receipts/${row.id}`)}
                    >
                      Qəbz
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="ws-empty" style={{ padding: 20 }}>
              <span>Hesab hərəkəti yoxdur.</span>
            </div>
          )}
        </section>
      )}
      {tab === "files" && (
        <section className="ws-panel pc-section">
          <header className="ws-registry-tools">
            <div>
              <p className="ws-eyebrow">Rentgen və sənədlər</p>
              <h2>Fayl arxivi</h2>
            </div>
          </header>
          <form className="ws-form-grid" style={{ padding: 20 }} onSubmit={uploadFile}>
            <label>
              Kateqoriya
              <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                <option value="XRAY">Rentgen</option>
                <option value="DOCUMENT">Sənəd</option>
                <option value="CONSENT">Razılıq</option>
                <option value="GENERAL">Ümumi</option>
              </select>
            </label>
            <label className="ws-form-wide">
              Fayl (max 5 MB)
              <input name="file" type="file" accept="image/*,.pdf" required />
            </label>
            <footer className="ws-form-wide">
              <button type="submit" className="ws-button ws-button--primary">
                Yüklə
              </button>
            </footer>
          </form>
          {files.length ? (
            <div className="ws-flow-list" style={{ padding: "0 20px 20px" }}>
              {files.map((file) => (
                <article className="ws-flow-card" key={file.id}>
                  <time>{new Date(file.createdAt).toLocaleDateString("az-AZ")}</time>
                  <div>
                    <b>{file.originalName}</b>
                    <span>
                      {file.category} · {(file.sizeBytes / 1024).toFixed(0)} KB · {file.uploadedBy}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ws-row-action"
                    onClick={() =>
                      void downloadAuthenticatedFile(
                        `/patients/${id}/files/${file.id}/download`,
                        file.originalName,
                      )
                    }
                  >
                    Bax
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="ws-empty" style={{ padding: 20 }}>
              <span>Fayl yoxdur.</span>
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default function PatientCardPage() {
  return (
    <Suspense
      fallback={
        <div className="ws-empty">
          <b>Klinik kart yüklənir...</b>
        </div>
      }
    >
      <ClinicalCard />
    </Suspense>
  );
}
