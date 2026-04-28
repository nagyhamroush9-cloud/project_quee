import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Button } from "../components/Button";

function priorityBadge(p) {
  const map = {
    EMERGENCY: "bg-red-500/15 text-red-600 dark:text-red-400",
    ELDERLY: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    DISABLED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    NORMAL: "bg-slate-500/10 text-slate-700 dark:text-slate-300"
  };
  return map[p] || map.NORMAL;
}

export function PatientQueue() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [entries, setEntries] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data.departments));
  }, []);

  useEffect(() => {
    if (!departmentId) return;
    api
      .get(`/queue/department/${departmentId}`)
      .then((r) => setEntries(r.data.entries))
      .catch(() => toast.error("Failed to load queue"));
  }, [departmentId]);

  useEffect(() => {
    api
      .get("/queue/me/status")
      .then((r) => setMyStatus(r.data?.result ?? null))
      .catch(() => setMyStatus(null));
  }, [departmentId]);

  const waiting = useMemo(() => entries.filter((e) => e.status === "WAITING"), [entries]);
  const called = useMemo(() => entries.filter((e) => e.status === "CALLED"), [entries]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("queue")}</div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("department")}</div>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">--</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">My wait</div>
            <div className="text-xl font-semibold">{myStatus?.stats?.estimatedWaitMinutes ?? 0}m</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {myStatus?.inQueue ? `Ahead: ${myStatus?.stats?.positionAhead ?? 0}` : "Not in queue"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">My triage</div>
            <div className="mt-1 text-xl font-semibold">{myStatus?.queue?.triageLevel || "—"}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {myStatus?.queue?.checkedInAt ? "Checked in" : myStatus?.inQueue ? "Not checked in" : ""}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Waiting</div>
            <div className="text-xl font-semibold">{waiting.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Called</div>
            <div className="text-xl font-semibold">{called.length}</div>
          </div>
        </div>

        {!myStatus?.inQueue ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-slate-600 dark:text-slate-300">
              Choose a department then pay (mock) and join the ER queue.
            </div>
            <Button
              disabled={joinLoading || !departmentId}
              onClick={async () => {
                setJoinLoading(true);
                try {
                  // Pay (mock) first
                  await api.post("/payments/mock-er", { amountCents: 1500, currency: "USD" });
                  // Then join ER queue
                  await api.post("/queue/me/join", { departmentId: Number(departmentId) });
                  const r = await api.get("/queue/me/status");
                  setMyStatus(r.data?.result ?? null);
                  toast.success("Ticket created");
                } catch (e) {
                  toast.error(e?.response?.data?.error?.message || "Failed");
                } finally {
                  setJoinLoading(false);
                }
              }}
            >
              {joinLoading ? "..." : "Pay & Join ER queue"}
            </Button>
          </div>
        ) : null}

        {myStatus?.inQueue && !myStatus?.queue?.checkedInAt ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-slate-600 dark:text-slate-300">
              To reduce ER crowding, please check in when you are in the hospital.
            </div>
            <button
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              disabled={checkinLoading}
              onClick={async () => {
                setCheckinLoading(true);
                try {
                  await api.post("/queue/er/checkin", { queueEntryId: myStatus.queue.id });
                  const r = await api.get("/queue/me/status");
                  setMyStatus(r.data?.result ?? null);
                  toast.success("Checked in");
                } catch (e) {
                  toast.error(e?.response?.data?.error?.message || "Check-in failed");
                } finally {
                  setCheckinLoading(false);
                }
              }}
            >
              {checkinLoading ? "..." : "Check in now"}
            </button>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">Live queue</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">{t("position")}</th>
                <th className="p-3">{t("ticket")}</th>
                <th className="p-3">{t("priority")}</th>
                <th className="p-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{e.position}</td>
                  <td className="p-3">#{e.ticket_number}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${priorityBadge(e.priority)}`}>{e.priority}</span>
                  </td>
                  <td className="p-3">{e.status}</td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                    —
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

