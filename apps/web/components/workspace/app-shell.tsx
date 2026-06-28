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
import {
  canAccessRoute,
  navigation,
  navigationGroups,
  type NavigationGroup,
  type NavigationItem,
  type WorkspaceRoute,
} from "../../lib/role-access";

type InboxNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

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
  const [openGroup, setOpenGroup] = useState<NavigationGroup | null>(null);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;

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
    setOpenGroup(null);
  }, [pathname]);

  const visible = user
    ? navigation.filter((item) => item.roles.includes(user.role))
    : [];
  const groupedNavigation = navigationGroups
    .map((group) => ({
      ...group,
      items: visible.filter((item) => item.group === group.id),
    }))
    .filter((group) => group.items.length > 0);

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

  useEffect(() => {
    if (!user) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      apiRequest<InboxNotification[]>("/notifications/inbox?take=30")
        .then((rows) => { if (active) setNotifications(rows); })
        .catch(() => undefined);
    };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user, pathname]);

  async function openNotification(item: InboxNotification) {
    if (!item.readAt) {
      await apiRequest(`/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => undefined);
      setNotifications((rows) => rows.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
    }
    setNotificationOpen(false);
    if (item.href) router.push(item.href);
  }

  async function readAllNotifications() {
    await apiRequest("/notifications/read-all", { method: "POST" });
    setNotifications((rows) => rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
  }

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
            <div className={`ws-notification-center ${notificationOpen ? "open" : ""}`}>
              <button
                type="button"
                className="ws-icon-button ws-notification-trigger"
                onClick={() => setNotificationOpen((value) => !value)}
                title="Bildirişlər"
                aria-label={`Bildirişlər${unreadNotifications ? `, ${unreadNotifications} oxunmamış` : ""}`}
                aria-expanded={notificationOpen}
              >
                <NavIcon name="notifications" size={17} />
                {unreadNotifications > 0 ? <em>{Math.min(unreadNotifications, 99)}</em> : null}
              </button>
              <div className="ws-notification-menu">
                <header>
                  <div><b>Bildirişlər</b><span>{unreadNotifications} oxunmamış</span></div>
                  {unreadNotifications > 0 ? <button type="button" onClick={() => void readAllNotifications()}>Hamısını oxu</button> : null}
                </header>
                <div>
                  {notifications.map((item) => (
                    <button
                      type="button"
                      className={item.readAt ? "" : "unread"}
                      key={item.id}
                      onClick={() => void openNotification(item)}
                    >
                      <i aria-hidden />
                      <span><b>{item.title}</b><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleString("az-AZ")}</time></span>
                    </button>
                  ))}
                  {!notifications.length ? <p>Yeni bildiriş yoxdur.</p> : null}
                </div>
              </div>
            </div>
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
          {groupedNavigation.map((group) => {
            const activeItem = group.items.find((item) => isNavActive(activePath, item.href));
            return (
              <div
                className={`ws-nav-group ${activeItem ? "active" : ""} ${openGroup === group.id ? "open" : ""}`}
                key={group.id}
                onMouseEnter={() => setOpenGroup(group.id)}
                onMouseLeave={() => setOpenGroup(null)}
              >
                <button
                  type="button"
                  className="ws-nav-group-trigger"
                  aria-expanded={openGroup === group.id}
                  onClick={() => setOpenGroup((current) => (current === group.id ? null : group.id))}
                  onFocus={() => setOpenGroup(group.id)}
                >
                  {activeItem ? <NavIcon name={activeItem.icon} size={16} /> : null}
                  <span>{activeItem?.label ?? group.label}</span>
                  {group.items.some((item) => item.href === "/approvals") && pendingApprovals > 0 && (
                    <em className="ws-nav-badge">{pendingApprovals}</em>
                  )}
                </button>
                <div className="ws-nav-group-menu">
                  {group.items.map((item) => (
                    <WorkspaceNavLink
                      key={item.href}
                      item={item}
                      active={isNavActive(activePath, item.href)}
                      pendingApprovals={pendingApprovals}
                      onNavigate={() => {
                        setPendingPath(item.href);
                        setOpenGroup(null);
                      }}
                    />
                  ))}
                </div>
              </div>
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

function WorkspaceNavLink({
  item,
  active,
  pendingApprovals,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  pendingApprovals: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      prefetch
      onClick={onNavigate}
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
}
