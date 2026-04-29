import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useAuth } from "../state/auth.jsx";

export function DoctorQueue() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userDepartmentId = user?.department?.id || user?.department_id || "";
  const [entries, setEntries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(userDepartmentId ? String(userDepartmentId) : "");
  const [calling, setCalling] = useState(false);
  const [completeId, setCompleteId] = useState("");
  const departmentId = selectedDepartmentId || (userDepartmentId ? String(userDepartmentId) : "");

  async function loadQueue(nextDepartmentId = departmentId) {
    if (!nextDepartmentId) {
      setEntries([]);
      return;
    }
    const { data } = await api.get(`/queue/department/${nextDepartmentId}`);
    setEntries(data.entries || []);
  }

  useEffect(() => {
    api
      .get("/departments/me")
      .then((r) => {
        const nextDepartments = r.data.departments || [];
        setDepartments(nextDepartments);
        if (!selectedDepartmentId && nextDepartments.length) {
          setSelectedDepartmentId(String(nextDepartments[0].id));
        }
      })
      .catch(() => toast.error(t("loadFailed")));
  }, []);

  useEffect(() => {
    if (!selectedDepartmentId && userDepartmentId) {
      setSelectedDepartmentId(String(userDepartmentId));
    }
  }, [selectedDepartmentId, userDepartmentId]);

  useEffect(() => {
    loadQueue().catch(() => toast.error(t("loadFailed")));
  }, [departmentId]);

  const callNext = async () => {
    setCalling(true);
    try {
      await api.post("/queue/call-next", { departmentId: Number(departmentId) });
      toast.success(t("called"));
      await loadQueue();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("callNextFailed"));
    } finally {
      setCalling(false);
    }
  };

  const completeQueueEntry = async (queueEntryId) => {
    try {
      await api.post("/queue/complete", { queueEntryId: Number(queueEntryId) });
      toast.success(t("completed"));
      setCompleteId("");
      await loadQueue();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("completeFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("queue")}</div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("department")}</div>
            <Select value={departmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)}>
              <option value="">{t("noDepartmentAssigned")}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button disabled={calling || !departmentId} onClick={callNext}>
              {calling ? "..." : t("callNext")}
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <Input value={completeId} onChange={(e) => setCompleteId(e.target.value)} placeholder={t("queueEntryId")} />
            <Button variant="secondary" disabled={!completeId} onClick={() => completeQueueEntry(completeId)}>
              {t("complete")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">{t("liveQueue")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">{t("position")}</th>
                <th className="p-3">{t("ticket")}</th>
                <th className="p-3">{t("fullName")}</th>
                <th className="p-3">{t("registeredAt")}</th>
                <th className="p-3">{t("priority")}</th>
                <th className="p-3">{t("status")}</th>
                <th className="p-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{e.position}</td>
                  <td className="p-3">#{e.ticket_number}</td>
                  <td className="p-3">{e.patient_name}</td>
                  <td className="p-3">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-3">{e.priority}</td>
                  <td className="p-3">{e.status}</td>
                  <td className="p-3">{e.id}</td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={7}>
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
