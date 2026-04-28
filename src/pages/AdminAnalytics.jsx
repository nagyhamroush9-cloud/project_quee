import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis, YAxis, AreaChart, Area, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";

export function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [queueSeries, setQueueSeries] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [deptMetrics, setDeptMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get("/admin/analytics"), api.get("/admin/analytics/queue", { params: { days: 14 } }), api.get("/departments")])
      .then(([a, q, d]) => {
        setData(a.data);
        setQueueSeries(q.data);
        setDepartments(d.data?.departments || []);
      })
      .catch(() => toast.error("Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!deptId) {
      setDeptMetrics(null);
      return;
    }
    api
      .get(`/queue/department/${deptId}/metrics`)
      .then((r) => setDeptMetrics(r.data?.metrics ?? null))
      .catch(() => setDeptMetrics(null));
  }, [deptId]);

  const bars = [
    { name: "Waiting", value: Number(data?.queueStats?.waiting ?? 0) },
    { name: "Called", value: Number(data?.queueStats?.called ?? 0) },
    { name: "Served", value: Number(data?.queueStats?.served ?? 0) }
  ];

  const patientsPerDay = (queueSeries?.patientsPerDay || []).map((r) => ({
    day: String(r.day).slice(5, 10),
    count: Number(r.count ?? 0)
  }));

  const avgWaitToCall = (queueSeries?.avgWaitToCallPerDay || []).map((r) => ({
    day: String(r.day).slice(5, 10),
    minutes: Math.round(Number(r.avgSeconds ?? 0) / 60)
  }));

  const avgWaitToServe = (queueSeries?.avgWaitToServePerDay || []).map((r) => ({
    day: String(r.day).slice(5, 10),
    minutes: Math.round(Number(r.avgSeconds ?? 0) / 60)
  }));

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">Analytics</div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Patients" value={data?.usersByRole?.patients ?? 0} />
        <StatCard label="Doctors" value={data?.usersByRole?.doctors ?? 0} />
        <StatCard label="Receptionists" value={data?.usersByRole?.receptionists ?? 0} />
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">ER crowding (today)</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">Department</div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
            >
              <option value="">--</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Waiting</div>
            <div className="mt-1 text-xl font-semibold">{Number(deptMetrics?.counts?.waiting ?? 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Avg wait to call</div>
            <div className="mt-1 text-xl font-semibold">{Math.round(Number(deptMetrics?.avgWaitToCallSeconds ?? 0) / 60)}m</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Queue status</div>
        <div className="h-64">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Patients per day</div>
        <div className="h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patientsPerDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Average wait to call (minutes)</div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={avgWaitToCall}>
                  <defs>
                    <linearGradient id="waitCall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="minutes" stroke="#f59e0b" fill="url(#waitCall)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Average wait to serve (minutes)</div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                Loading...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={avgWaitToServe}>
                  <defs>
                    <linearGradient id="waitServe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="minutes" stroke="#0ea5e9" fill="url(#waitServe)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

