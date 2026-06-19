import { useState } from "react";
import { LOCALES, type Locale, useLocale } from "./LocaleProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api-production-e6391.up.railway.app/api";

type SubscriptionPlan = "basic" | "professional" | "enterprise";

interface SubscriptionPlanData {
  name: string;
  price: number;
  maxUsers: number;
  maxPatients: number;
  features: string[];
}

const subscriptionPlans: Record<SubscriptionPlan, SubscriptionPlanData> = {
  basic: {
    name: "Əsas Paket",
    price: 100,
    maxUsers: 5,
    maxPatients: 100,
    features: [
      "5 istifadəçi limiti",
      "100 pasiyent limiti",
      "Əsas funksiyalar",
    ],
  },
  professional: {
    name: "Peşəkar Paket",
    price: 200,
    maxUsers: 15,
    maxPatients: 500,
    features: [
      "15 istifadəçi limiti",
      "500 pasiyent limiti",
      "Əlavə funksiyalar",
      "Prioritet dəstək",
    ],
  },
  enterprise: {
    name: "Korporativ Paket",
    price: 500,
    maxUsers: 50,
    maxPatients: 2000,
    features: [
      "50 istifadəçi limiti",
      "2000 pasiyent limiti",
      "Bütün funksiyalar",
      "Premium dəstək",
    ],
  },
};

interface ClinicSubscriptionData {
  clinic: {
    id: string;
    name: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionStart: string | null;
    subscriptionEnd: string | null;
    maxUsers: number;
    maxPatients: number;
  };
  plan: SubscriptionPlanData;
  usage: {
    currentUsers: number;
    currentPatients: number;
    userLimit: number;
    patientLimit: number;
  };
}

export function SubscriptionManager() {
  // Modal state for clinic creation
  const [showModal, setShowModal] = useState(false);
  const [modalPlan, setModalPlan] = useState<SubscriptionPlan | null>(null);
  const [modalClinicName, setModalClinicName] = useState("");
  const [modalAdminEmail, setModalAdminEmail] = useState("");
  const [modalAdminPassword, setModalAdminPassword] = useState("");
  const [clinicData, setClinicData] = useState<ClinicSubscriptionData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useLocale();

  const loadSubscriptionData = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("hospital_portal_token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        return;
      }

      // JWT'den clinicId'yi decode et
      const payload = JSON.parse(atob(token.split(".")[1]));
      const clinicId = payload.clinicId;

      if (!clinicId) {
        setError("Klinik bilgisi bulunamadı.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/subscription/clinic/${clinicId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Abonelik bilgileri yüklenemedi.");
      }

      const data = await response.json();
      setClinicData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const openClinicModal = (plan: SubscriptionPlan) => {
    setModalPlan(plan);
    setModalClinicName("");
    setModalAdminEmail("");
    setModalAdminPassword("");
    setShowModal(true);
  };

  // Əvvəlcə ödəniş linki al, sonra klinika yaradılması üçün backend-ə yönləndir
  const createClinicWithSubscription = async () => {
    if (!modalPlan) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!modalClinicName || !modalAdminEmail || !modalAdminPassword) {
        setError("Bütün sahələri doldurun.");
        return;
      }

      // Burada ödəniş funksiyası silindi. ABB və ya digər bank inteqrasiyası üçün ayrıca funksiya əlavə ediləcək.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "trial":
        return "text-blue-600";
      case "expired":
        return "text-red-600";
      case "cancelled":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "trial":
        return "Deneme";
      case "expired":
        return "Süresi Dolmuş";
      case "cancelled":
        return "İptal Edilmiş";
      default:
        return status;
    }
  };

  return (
    <div className="subscription-manager">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Abonelik Yönetimi</span>
          <h2>Klinik Abonelik Sistemi</h2>
        </div>
      </div>

      {message && <p className="status-ok">{message}</p>}
      {error && <p className="status-error">{error}</p>}

      {!clinicData ? (
        <div className="subscription-plans">
          <h3>Abonelik Paketleri</h3>
          <div className="plans-grid">
            {Object.entries(subscriptionPlans).map(([key, plan]) => (
              <div key={key} className="plan-card">
                <h4>{plan.name}</h4>
                <div className="plan-price">{plan.price} AZN/ay</div>
                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>✓ {feature}</li>
                  ))}
                </ul>
                <div className="plan-limits">
                  <div>
                    {t("subscription.users", "İstifadəçi")}: {plan.maxUsers}
                  </div>
                  <div>
                    {t("subscription.patients", "Pasiyent")}: {plan.maxPatients}
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openClinicModal(key as SubscriptionPlan)}
                  disabled={loading}
                >
                  {t("subscription.createClinic", "Yeni klinika yarat")}
                </button>
              </div>
            ))}
            {/* Modal for clinic creation */}
            {showModal && (
              <div
                className="modal-backdrop"
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.3)",
                  zIndex: 1000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className="modal"
                  style={{
                    background: "#fff",
                    padding: 32,
                    borderRadius: 12,
                    minWidth: 320,
                    maxWidth: 400,
                  }}
                >
                  <h3>
                    {t("subscription.createClinic", "Yeni klinika yarat")}
                  </h3>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    {t("subscription.clinicName", "Klinika adı")}
                    <input
                      value={modalClinicName}
                      onChange={(e) => setModalClinicName(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    {t("subscription.adminEmail", "Admin e-poçtu")}
                    <input
                      value={modalAdminEmail}
                      onChange={(e) => setModalAdminEmail(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ display: "block", marginBottom: 16 }}>
                    {t(
                      "subscription.adminPassword",
                      "Admin şifrə (min 8 simvol)",
                    )}
                    <input
                      type="password"
                      value={modalAdminPassword}
                      onChange={(e) => setModalAdminPassword(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      onClick={createClinicWithSubscription}
                      className="primary-button"
                    >
                      {t("subscription.confirm", "Təsdiqlə")}
                    </button>
                    <button type="button" onClick={() => setShowModal(false)}>
                      {t("subscription.cancel", "Ləğv et")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="existing-clinic">
            <h3>Klinikanız Var?</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={loadSubscriptionData}
              disabled={loading}
            >
              Abonelik Bilgilərini Yüklə
            </button>
          </div>
        </div>
      ) : (
        <div className="subscription-details">
          <div className="clinic-info">
            <h3>{clinicData.clinic.name}</h3>
            <div className="status-info">
              <span
                className={`status ${getStatusColor(clinicData.clinic.subscriptionStatus)}`}
              >
                {getStatusText(clinicData.clinic.subscriptionStatus)}
              </span>
              <span className="plan-name">{clinicData.plan.name}</span>
            </div>
          </div>

          <div className="usage-stats">
            <h4>İstifadə Statistikası</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">İstifadəçilər</div>
                <div className="stat-value">
                  {clinicData.usage.currentUsers} / {clinicData.usage.userLimit}
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${(clinicData.usage.currentUsers / clinicData.usage.userLimit) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Pasiyentler</div>
                <div className="stat-value">
                  {clinicData.usage.currentPatients} /{" "}
                  {clinicData.usage.patientLimit}
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${(clinicData.usage.currentPatients / clinicData.usage.patientLimit) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="subscription-info">
            <h4>Abonəlik məlumatları</h4>
            <div className="info-grid">
              <div>
                <span>Paket:</span>
                <strong>{clinicData.plan.name}</strong>
              </div>
              <div>
                <span>Aylıq məbləğ:</span>
                <strong>{clinicData.plan.price} AZN</strong>
              </div>
              {clinicData.clinic.subscriptionEnd && (
                <div>
                  <span>Bitiş Tarixi:</span>
                  <strong>
                    {new Date(
                      clinicData.clinic.subscriptionEnd,
                    ).toLocaleDateString("tr-TR")}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div className="plan-features">
            <h4>Paket Xüsusiyyətləri</h4>
            <ul>
              {clinicData.plan.features.map((feature, index) => (
                <li key={index}>✓ {feature}</li>
              ))}
            </ul>
          </div>

          <div className="subscription-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setClinicData(null)}
            >
              Paketləri görün
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .subscription-manager {
          padding: 20px;
        }

        .subscription-plans {
          margin-top: 20px;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .plan-card {
          border: 1px solid #767676;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .plan-price {
          font-size: 24px;
          font-weight: bold;
          color: #1646ad;
          margin: 10px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 15px 0;
        }

        .plan-features li {
          margin: 5px 0;
          text-align: left;
        }


        .plan-limits {
          background: #3b3b3b;
          color: #25D366;
          padding: 10px;
          border-radius: 8px;
          margin: 15px 0;
          font-size: 1rem;
        }
        body.dark .plan-limits {
          background: #232627;
          color: #25D366;
        }
        .plan-features li {
          color: #25D366;
        }
        body.dark .plan-features li {
          color: #25D366;
        }

        .existing-clinic {
          margin-top: 30px;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          text-align: center;
        }

        .subscription-details {
          margin-top: 20px;
        }

        .clinic-info {
          margin-bottom: 30px;
        }

        .status-info {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }

        .usage-stats {
          margin-bottom: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
        }

        .stat-item {
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        .stat-label {
          font-weight: bold;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 18px;
          margin-bottom: 10px;
        }

        .stat-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .stat-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.3s ease;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }

        .info-grid > div {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .plan-features ul {
          list-style: none;
          padding: 0;
        }

        .plan-features li {
          margin: 5px 0;
        }

        .subscription-actions {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .primary-button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }

        .primary-button:hover {
          background: #1d4ed8;
        }

        .primary-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .secondary-button {
          background: white;
          color: #2563eb;
          border: 1px solid #2563eb;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }

        .secondary-button:hover {
          background: #f8f9fa;
        }

        .status-ok {
          color: #059669;
          background: #ecfdf5;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .status-error {
          color: #dc2626;
          background: #fef2f2;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
}
