"use client";

import { permissionActions, permissionModules } from "../../../lib/permission-matrix";
import { roleLabel, type StaffRole } from "../../../lib/lovelydent-api";

const visibleRoles: StaffRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CALL_CENTER",
  "DOCTOR",
  "NURSE",
  "CASHIER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
];

export default function PermissionsPage() {
  return (
    <div>
      <section className="ws-page-head">
        <div>
          <p className="ws-eyebrow">İdarəetmə skeleti</p>
          <h1>Rol və icazə xəritəsi</h1>
          <span>Bu mərhələ sabit permission matrix-dir. Sonrakı real mərhələdə DB-dən dəyişən icazə sisteminə çevrilə bilər.</span>
        </div>
      </section>

      <section className="ws-panel pc-section">
        <header>
          <div>
            <p className="ws-eyebrow">Matrix</p>
            <h2>Rollar üzrə əməliyyat hüquqları</h2>
          </div>
        </header>
        <div style={{ overflowX: "auto" }}>
          <table className="ws-data-table">
            <thead>
              <tr>
                <th>Modul</th>
                {permissionActions.map((action) => (
                  <th key={action.key}>{action.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionModules.map((module) => (
                <tr key={module.key}>
                  <td>
                    <strong>{module.label}</strong>
                    <small>{module.description}</small>
                  </td>
                  {permissionActions.map((action) => (
                    <td key={action.key}>
                      <div className="ws-role-pills">
                        {(module.actions[action.key] ?? []).map((role) => (
                          <span key={role}>{roleLabel[role]}</span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pc-grid" style={{ marginTop: 22 }}>
        {visibleRoles.map((role) => (
          <article className="ws-panel pc-section" key={role}>
            <p className="ws-eyebrow">{role}</p>
            <h2>{roleLabel[role]}</h2>
            <div className="ws-role-pills">
              {permissionModules
                .filter((module) => Object.values(module.actions).some((roles) => roles?.includes(role)))
                .map((module) => (
                  <span key={module.key}>{module.label}</span>
                ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
