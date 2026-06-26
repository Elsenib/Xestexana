"use client";

type ReadinessItem = {
  title: string;
  status: "READY" | "SKELETON" | "REAL_NEXT";
  note: string;
};

const statusLabel = {
  READY: "MVP hazır",
  SKELETON: "Skelet hazır",
  REAL_NEXT: "Real mərhələ",
} as const;

const statusMeta = {
  READY: { color: "#0f6b5f", bg: "#d8efe9" },
  SKELETON: { color: "#8a5a1f", bg: "#f3e8d4" },
  REAL_NEXT: { color: "#9d3b34", bg: "#fff0ef" },
} as const;

const items: ReadinessItem[] = [
  {
    title: "Rol əsaslı workspace və qruplu naviqasiya",
    status: "READY",
    note: "Modullar qruplaşdırılıb, uzun navbar scroll problemi azaldılıb.",
  },
  {
    title: "Pasiyent kartı, anamnez, klinik qeyd və fayllar",
    status: "READY",
    note: "Rentgen/fayl upload DB storage ilə qorunur, kartda preview/action axını var.",
  },
  {
    title: "CRM lead, recall və lead → pasiyent çevirmə",
    status: "READY",
    note: "Lead yaradılır, aktivlik qeydi yazılır və pasiyent kartına çevrilir.",
  },
  {
    title: "Anbar və approval engine",
    status: "SKELETON",
    note: "Approval mexanizmi var; real mərhələdə bütün kritik əməliyyatlar tam avtomatik ledger-ə bağlanmalıdır.",
  },
  {
    title: "Maliyyə, qəbz, kassa və pasiyent hesabı",
    status: "SKELETON",
    note: "MVP axını mövcuddur; real mərhələdə treatment → borc → payment → receipt zənciri tam bağlanacaq.",
  },
  {
    title: "Həkim faizi",
    status: "SKELETON",
    note: "Faiz qaydası və manual komissiya var; real mərhələdə icra olunmuş xidmət/ödəniş bazasına avtomatik bağlanacaq.",
  },
  {
    title: "Zəmanət kitabçası",
    status: "SKELETON",
    note: "Şablon və pasiyent zəmanəti var; real mərhələdə treatment plan və PDF/çap axınına bağlanacaq.",
  },
  {
    title: "Backup, audit və permission matrix",
    status: "SKELETON",
    note: "Panel və əsas struktur hazırdır; real mərhələdə real dump, storage, restore test və DB permission lazımdır.",
  },
  {
    title: "Real production təhlükəsizliyi",
    status: "REAL_NEXT",
    note: "S3/R2 storage, staging, CI/CD, monitoring, rollback və test avtomatlaşdırması qurulmalıdır.",
  },
];

const nextSteps = [
  "Approval engine-i anbar, maliyyə və klinik dəyişikliklərdə məcburi hala gətirmək.",
  "Müalicə planı sətrini prosedura çevirmək və avtomatik borc yaratmaq.",
  "Ödənişdən sonra qəbz, kassa qalığı və həkim faizini avtomatik yeniləmək.",
  "Backup mexanizmini real DB dump + obyekt storage + restore testinə çevirmək.",
  "UI-də əsas axınları role görə daha az addımlı etmək və gizli scroll sahələrini azaltmaq.",
];

export default function ReadinessPage() {
  const readyCount = items.filter((item) => item.status === "READY").length;
  const skeletonCount = items.filter((item) => item.status === "SKELETON").length;
  const realNextCount = items.filter((item) => item.status === "REAL_NEXT").length;

  return (
    <div>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">MVP yekun baxış</p>
          <h1>Hazırlıq paneli</h1>
          <span>Bu səhifə skelet mərhələsinin bağlanması və real iş mərhələsinə keçid üçün nəzarət siyahısıdır.</span>
        </div>
      </section>

      <section className="ws-metrics">
        <article>
          <span>MVP hazır</span>
          <strong>{readyCount}</strong>
          <small>Demo üçün işlək axınlar</small>
        </article>
        <article>
          <span>Skelet hazır</span>
          <strong>{skeletonCount}</strong>
          <small>Real avtomatikaya bağlanacaq modullar</small>
        </article>
        <article>
          <span>Real mərhələ</span>
          <strong>{realNextCount}</strong>
          <small>Production keyfiyyəti üçün qalanlar</small>
        </article>
      </section>

      <section className="pc-grid">
        <article className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Status</p>
              <h2>Modul hazırlığı</h2>
            </div>
          </header>
          {items.map((item) => (
            <div className="ws-flow-card" key={item.title}>
              <div>
                <b>{item.title}</b>
                <span>{item.note}</span>
              </div>
              <em style={{ background: statusMeta[item.status].bg, color: statusMeta[item.status].color }}>
                {statusLabel[item.status]}
              </em>
            </div>
          ))}
        </article>

        <aside className="ws-panel pc-section">
          <header>
            <div>
              <p className="ws-eyebrow">Keçid planı</p>
              <h2>Real işə keçəndə</h2>
            </div>
          </header>
          {nextSteps.map((step, index) => (
            <div className="ws-flow-card" key={step}>
              <time>{index + 1}</time>
              <div>
                <b>{step}</b>
                <span>Bu addım MVP skeletini real klinika əməliyyatına çevirir.</span>
              </div>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}
