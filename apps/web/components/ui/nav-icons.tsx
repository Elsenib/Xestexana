import type { ReactNode } from "react";

export type NavIconId =
  | "dashboard"
  | "tasks"
  | "calendar"
  | "patients"
  | "crm"
  | "clinical"
  | "treatments"
  | "finance"
  | "commission"
  | "warranty"
  | "backup"
  | "permissions"
  | "audit"
  | "inventory"
  | "reports"
  | "administration"
  | "approvals"
  | "logout";

type NavIconProps = {
  name: NavIconId;
  size?: number;
  className?: string;
};

const paths: Record<NavIconId, ReactNode> = {
  dashboard: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </>
  ),
  tasks: (
    <>
      <path d="M8 6h11M8 12h11M8 18h11" />
      <path d="m4 6 .8.8L6.5 5M4 12l.8.8L6.5 11M4 18l.8.8L6.5 17" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  patients: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </>
  ),
  crm: (
    <>
      <path d="M5 5h14v10H8l-3 3V5Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  clinical: (
    <>
      <path d="M12 4v16M4 12h16" />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </>
  ),
  treatments: (
    <>
      <path d="M7 7h10v4H7zM7 13h6v4H7z" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h4M7 14h2" />
      <circle cx="16" cy="12" r="2" />
    </>
  ),
  commission: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="m18 6-12 12" />
    </>
  ),
  warranty: (
    <>
      <path d="M12 3 19 6v5c0 4.5-2.8 7.9-7 10-4.2-2.1-7-5.5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  backup: (
    <>
      <path d="M12 3a9 9 0 1 1-8.1 5.1" />
      <path d="M4 4v4h4" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  permissions: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M3 20c.7-3 2.7-5 5-5" />
      <path d="M14 14l2 2 5-5" />
      <path d="M14 20h7" />
    </>
  ),
  audit: (
    <>
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M8 13h8M8 17h6" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 8 12 4l8 4v9l-8 4-8-4V8z" />
      <path d="M12 12v9M4 8l8 4 8-4" />
    </>
  ),
  reports: (
    <>
      <path d="M6 20V10M12 20V4M18 20v-7" />
      <path d="M4 20h16" />
    </>
  ),
  administration: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  approvals: (
    <>
      <path d="M5 12.5 9.5 17 19 7" />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9" />
    </>
  ),
};

export function NavIcon({ name, size = 18, className }: NavIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
