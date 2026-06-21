"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  apiRequest,
  CurrentUser,
  roleLabel,
  TOKEN_KEY,
} from "../../lib/lovelydent-api";
import { canAccessRoute, navigation } from "../../lib/role-access";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      router.replace("/");
      return;
    }
    apiRequest<CurrentUser>("/auth/me")
      .then((currentUser) => {
        if (currentUser.role === "PATIENT") {
          localStorage.removeItem(TOKEN_KEY);
          router.replace("/");
          return;
        }
        setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/");
      })
      .finally(() => setReady(true));
  }, [router]);
  useEffect(() => {
    if (user && pathname && !canAccessRoute(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [pathname, router, user]);
  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);
  const visible = user
    ? navigation.filter((item) => item.roles.includes(user.role))
    : [];
  useEffect(() => {
    if (!user) return;
    visible.forEach((item) => router.prefetch(item.href));
  }, [router, user]);
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
              prefetch
              onClick={() => setPendingPath(item.href)}
              className={(pendingPath ?? pathname) === item.href ? "active" : ""}
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
        {pendingPath && pendingPath !== pathname && (
          <div className="ws-route-progress" aria-label="Səhifə açılır" />
        )}
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
