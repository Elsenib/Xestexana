"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { BrandMark } from "../ui/brand-mark";
import { NavIcon } from "../ui/nav-icons";
import {
  apiRequest,
  CurrentUser,
  roleLabel,
  TOKEN_KEY,
} from "../../lib/lovelydent-api";
import { canAccessRoute, navigation, type WorkspaceRoute } from "../../lib/role-access";

function isNavActive(pathname: string | null, href: WorkspaceRoute) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);

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
  }, [router, user, visible]);

  useEffect(() => {
    if (!user || !visible.some((item) => item.href === "/approvals")) return;
    apiRequest<{ pendingForReview: number }>("/approvals/summary")
      .then((summary) => setPendingApprovals(summary.pendingForReview))
      .catch(() => setPendingApprovals(0));
  }, [user, visible, pathname]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/");
  }

  if (!ready || !user)
    return (
      <div className="ws-loading">
        <BrandMark size={44} />
        <p>İş məkanı hazırlanır...</p>
      </div>
    );

  const activePath = pendingPath ?? pathname;

  return (
    <div className="ws-app">
      <header className="ws-header">
        <div className="ws-header-top">
          <Link href="/dashboard" className="ws-brand" prefetch>
            <BrandMark size={36} />
            <div>
              <b>LovelyDent</b>
              <span>Klinik iş məkanı</span>
            </div>
          </Link>

          <div className="ws-header-actions">
            <span className="ws-status-pill">
              <span className="ws-status-dot" aria-hidden />
              Aktiv
            </span>
            <div className="ws-user-chip">
              <i>{user.email.slice(0, 2).toUpperCase()}</i>
              <div>
                <b>{user.email.split("@")[0]}</b>
                <span>{roleLabel[user.role]}</span>
              </div>
            </div>
            <button
              type="button"
              className="ws-icon-button"
              onClick={logout}
              title="Çıxış"
              aria-label="Çıxış"
            >
              <NavIcon name="logout" size={17} />
            </button>
          </div>
        </div>

        <nav className="ws-module-nav" aria-label="Modullar">
          {visible.map((item) => {
            const active = isNavActive(activePath, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setPendingPath(item.href)}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={item.icon} size={16} />
                <span>{item.label}</span>
                {item.href === "/approvals" && pendingApprovals > 0 && (
                  <em className="ws-nav-badge">{pendingApprovals}</em>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {pendingPath && pendingPath !== pathname && (
        <div className="ws-route-progress" aria-label="Səhifə açılır" />
      )}

      <main className="ws-main">{children}</main>
    </div>
  );
}
