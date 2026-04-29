import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Select } from "../components/Select";
import { Button } from "../components/Button";
import { useAuth } from "../state/auth.jsx";

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
  const { user } = useAuth();
  const userDepartmentId = user?.department?.id || user?.department_id || "";
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(userDepartmentId);
  const [entries, setEntries] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  async function loadQueue(nextDepartmentId = departmentId) {
    if (!nextDepartmentId) {
      setEntries([]);
      return;
    }
    const { data } = await api.get(`/queue/department/${nextDepartmentId}`);
    setEntries(data.entries || []);
  }

  async function loadStatus() {
    const { data } = await api.get("/queue/me/status");
    setMyStatus(data?.result ?? null);
  }

  useEffect(() => {
    api
      .get("/departments")
      .then((r) => setDepartments(r.data.departments || []))
      .catch(() => toast.error(t("loadFailed")));
    loadStatus().catch(() => setMyStatus(null));
  }, []);

  useEffect(() => {
    if (!departmentId && userDepartmentId) setDepartmentId(userDepartmentId);
  }, [departmentId, userDepartmentId]);

  useEffect(() => {
    loadQueue().catch(() => toast.error(t("loadFailed")));
    loadStatus().catch(() => setMyStatus(null));
  }, [departmentId]);

  const waiting = useMemo(() => entries.filter((e) => e.status === "WAITING"), [entries]);
  const called = useMemo(() => entries.filter((e) => e.status === "CALLED"), [entries]);

  const joinQueue = async () => {
    if (!departmentId) {
      toast.error(t("selectDepartment"));
      return;
    }

    setJoinLoading(true);
    try {
      await api.post("/payments/mock-er", { amountCents: 1500, currency: "USD" });
      await api.post("/queue/me/join", { departmentId: Number(departmentId) });
      await loadStatus();
      await loadQueue();
      toast.success(t("ticketCreated"));
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("queueJoinFailed"));
    } finally {
      setJoinLoading(false);
    }
  };

  const checkIn = async () => {
    setCheckinLoading(true);
    try {
      await api.post("/queue/er/checkin", { queueEntryId: myStatus.queue.id });
      await loadStatus();
      await loadQueue();
      toast.success(t("checkedIn"));
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("checkInFailed"));
    } finally {
      setCheckinLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("queue")}</div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("myWait")}</div>
            <div className="text-xl font-semibold">{myStatus?.stats?.estimatedWaitMinutes ?? 0}m</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {myStatus?.inQueue ? `${t("ahead")}: ${myStatus?.stats?.positionAhead ?? 0}` : t("notInQueue")}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("myTriage")}</div>
            <div className="mt-1 text-xl font-semibold">{myStatus?.queue?.triageLevel || "-"}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {myStatus?.queue?.checkedInAt ? t("checkedIn") : myStatus?.inQueue ? t("notCheckedIn") : ""}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("waiting")}</div>
            <div className="text-xl font-semibold">{waiting.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("called")}</div>
            <div className="text-xl font-semibold">{called.length}</div>
          </div>
        </div>

        {!myStatus?.inQueue ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-slate-600 dark:text-slate-300">{t("chooseDepartmentJoin")}</div>
            <Button disabled={joinLoading || !departmentId} onClick={joinQueue}>
              {joinLoading ? "..." : t("payJoinQueue")}
            </Button>
          </div>
        ) : null}

        {myStatus?.inQueue && !myStatus?.queue?.checkedInAt ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-slate-600 dark:text-slate-300">{t("checkInHint")}</div>
            <Button disabled={checkinLoading} onClick={checkIn}>
              {checkinLoading ? "..." : t("checkInNow")}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">{t("liveQueue")}</div>
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
                    {t("noQueueEntries")}
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
