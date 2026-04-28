import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, CalendarClock, CreditCard, LayoutDashboard, LogOut, ScrollText, Users, User, Bell, MessageCircle } from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../state/auth.jsx";
import { useTheme } from "../state/theme.jsx";

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800",
          isActive && "bg-slate-100 font-semibold dark:bg-slate-800"
        )
      }
    >
      <Icon className="h-4 w-4 opacity-80" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function AppShell({ children }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const role = user?.role;
  const links = [];
  links.push({ to: "/app", icon: LayoutDashboard, label: t("dashboard") });
  links.push({ to: "/app/chat", icon: MessageCircle, label: t("chat") });
  links.push({ to: "/app/notifications", icon: Bell, label: t("notifications") });

  if (role === "PATIENT") {
    links.push({ to: "/app/appointments", icon: CalendarClock, label: t("appointments") });
    links.push({ to: "/app/payments", icon: CreditCard, label: t("payments") });
    links.push({ to: "/app/queue", icon: Activity, label: t("queue") });
    links.push({ to: "/app/profile", icon: User, label: t("profile") });
  }
  if (role === "RECEPTIONIST") {
    links.push({ to: "/app/reception/queue", icon: Activity, label: t("queue") });
  }
  if (role === "DOCTOR") {
    links.push({ to: "/app/doctor/appointments", icon: CalendarClock, label: t("appointments") });
    links.push({ to: "/app/doctor/queue", icon: Activity, label: t("queue") });
  }
  if (role === "ADMIN") {
    links.push({ to: "/app/admin/analytics", icon: Activity, label: t("analytics") });
    links.push({ to: "/app/admin/users", icon: Users, label: t("users") });
    links.push({ to: "/app/admin/appointments", icon: CalendarClock, label: t("appointments") });
    links.push({ to: "/app/admin/audit", icon: ScrollText, label: "Audit" });
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-[280px_1fr] md:p-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{t("appName")}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.full_name || user?.fullName || user?.email}</div>
            </div>
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              onClick={() => {
                const next = i18n.language === "ar" ? "en" : "ar";
                i18n.changeLanguage(next);
              }}
            >
              {i18n.language === "ar" ? "EN" : "AR"}
            </button>
          </div>

          <div className="mt-4 space-y-1">{links.map((l) => <Item key={l.to} {...l} />)}</div>

          <div className="mt-4 flex gap-2">
            <button
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              onClick={toggle}
            >
              {t("darkMode")}: {theme === "dark" ? "ON" : "OFF"}
            </button>
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title={t("logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className="min-h-[70vh]">{children}</main>
      </div>
    </div>
  );
}

