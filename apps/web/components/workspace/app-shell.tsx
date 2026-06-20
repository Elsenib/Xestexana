"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  apiRequest,
  CurrentUser,
  roleLabel,
  StaffRole,
  TOKEN_KEY,
} from "../../lib/lovelydent-api";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: StaffRole[];
};
const clinical: StaffRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CALL_CENTER",
  "DOCTOR",
  "NURSE",
];
const navigation: NavItem[] = [
  { href: "/dashboard", label: "İş masası", icon: "⌂" },
  {
    href: "/appointments",
    label: "Təqvim və qəbullar",
    icon: "□",
    roles: clinical,
  },
  { href: "/patients", label: "Pasiyentlər", icon: "♙", roles: clinical },
  {
    href: "/clinical",
    label: "Klinik iş",
    icon: "+",
    roles: ["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE"],
  },
  {
    href: "/finance",
    label: "Kassa və maliyyə",
    icon: "₼",
    roles: ["SUPER_ADMIN", "ADMIN", "CASHIER", "ACCOUNTANT", "MANAGEMENT"],
  },
  {
    href: "/inventory",
    label: "Anbar",
    icon: "◇",
    roles: ["SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER"],
  },
  {
    href: "/reports",
    label: "Hesabatlar",
    icon: "⌁",
    roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGEMENT"],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      router.replace("/");
      return;
    }
    apiRequest<CurrentUser>("/auth/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/");
      })
      .finally(() => setReady(true));
  }, [router]);
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/");
  }
  if (!ready || !user)
    return (
      <div className="ws-loading">
        <span>LD</span>
        <p>İş məkanı hazırlanır...</p>
      </div>
    );
  const visible = navigation.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );
  return (
    <div className="ws-app">
      <aside className="ws-sidebar">
        <div className="ws-brand">
          <span>LD</span>
          <b>LovelyDent</b>
        </div>
        <nav>
          <small>İŞ MƏKANI</small>
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ws-user">
          <i>{user.email.slice(0, 2).toUpperCase()}</i>
          <div>
            <b>{user.email.split("@")[0]}</b>
            <span>{roleLabel[user.role]}</span>
          </div>
          <button onClick={logout} title="Çıxış">
            ↗
          </button>
        </div>
      </aside>
      <div className="ws-stage">
        <header className="ws-topbar">
          <div>
            <span className="ws-status-dot" /> LovelyDent Clinic <b>·</b> Bakı
            filialı
          </div>
          <div className="ws-top-actions">
            <button aria-label="Axtarış">⌕</button>
            <button aria-label="Bildirişlər">○</button>
          </div>
        </header>
        <main className="ws-main">{children}</main>
      </div>
    </div>
  );
}
