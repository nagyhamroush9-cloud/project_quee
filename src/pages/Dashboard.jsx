import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, Area, AreaChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../state/auth.jsx";
import { api } from "../lib/api";

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [queueSeries, setQueueSeries] = useState(null);

  const trend = useMemo(() => {
    const rows = queueSeries?.patientsPerDay || [];
    return rows.map((r) => ({
      day: String(r.day).slice(5, 10),
      value: Number(r.count ?? 0)
    }));
  }, [queueSeries]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api
      .get("/admin/analytics")
      .then((r) => setAnalytics(r.data))
      .catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api
      .get("/admin/analytics/queue", { params: { days: 7 } })
      .then((r) => setQueueSeries(r.data))
      .catch(() => {});
  }, [user?.role]);

  const role = user?.role;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">{t("dashboard")}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {user?.full_name || user?.fullName} • {role}
        </div>
      </div>

      {role === "ADMIN" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label={t("users")} value={(analytics?.usersByRole?.patients ?? 0) + (analytics?.usersByRole?.doctors ?? 0)} />
          <StatCard label={t("queue")} value={analytics?.queueStats?.waiting ?? 0} hint="Waiting" />
          <StatCard label={t("appointments")} value={analytics?.apptStats?.booked ?? 0} hint="Booked" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label={t("queue")} value="Live" hint="Real-time updates enabled" />
          <StatCard label={t("appointments")} value="Today" hint="Schedule and queue" />
          <StatCard label={t("notifications")} value="In-app + SMS/WhatsApp" hint="Simulated channels" />
        </div>
      )}

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Patients per day (last 7 days)</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="url(#fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

