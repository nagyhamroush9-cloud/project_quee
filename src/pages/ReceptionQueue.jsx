import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";

export function ReceptionQueue() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [entries, setEntries] = useState([]);

  const [patientId, setPatientId] = useState("");
  const [patientQ, setPatientQ] = useState("");
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientStatus, setPatientStatus] = useState(null);
  const [priority, setPriority] = useState("AUTO");
  const [creating, setCreating] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [triageLoadingId, setTriageLoadingId] = useState(null);

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data.departments));
  }, []);

  useEffect(() => {
    if (!departmentId) return;
    api.get(`/queue/department/${departmentId}`).then((r) => setEntries(r.data.entries));
  }, [departmentId]);

  useEffect(() => {
    if (!departmentId) {
      setMetrics(null);
      return;
    }
    api
      .get(`/queue/department/${departmentId}/metrics`)
      .then((r) => setMetrics(r.data?.metrics ?? null))
      .catch(() => setMetrics(null));
  }, [departmentId]);

  useEffect(() => {
    const q = patientQ.trim();
    const timeout = setTimeout(async () => {
      setPatientsLoading(true);
      try {
        const { data } = await api.get("/users/patients", { params: { q: q || undefined, limit: 20, offset: 0 } });
        setPatients(data.patients || []);
      } catch (e) {
        setPatients([]);
      } finally {
        setPatientsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [patientQ]);

  useEffect(() => {
    if (!patientId) {
      setPatientStatus(null);
      return;
    }
    api
      .get("/queue/patient-search", { params: { patientId: Number(patientId) } })
      .then((r) => setPatientStatus(r.data?.results?.[0] ?? null))
      .catch(() => setPatientStatus(null));
  }, [patientId]);

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
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("search")}</div>
            <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="name/email/phone" />
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {patientsLoading ? "Searching..." : "Pick a patient below"}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("patient")}</div>
            <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">--</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} • {p.full_name} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("priority")}</div>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="AUTO">{t("auto")}</option>
              <option value="EMERGENCY">{t("emergency")}</option>
              <option value="ELDERLY">{t("elderly")}</option>
              <option value="DISABLED">{t("disabled")}</option>
              <option value="NORMAL">{t("normal")}</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              disabled={creating || !departmentId || !patientId}
              onClick={async () => {
                setCreating(true);
                try {
                  await api.post("/queue/walkin", {
                    patientId: Number(patientId),
                    departmentId: Number(departmentId),
                    priority
                  });
                  toast.success("Added");
                } catch (e) {
                  toast.error(e?.response?.data?.error?.message || "Failed");
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? "..." : t("addWalkIn")}
            </Button>
          </div>
        </div>
      </Card>

      {metrics ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card className="p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Waiting today</div>
            <div className="mt-1 text-2xl font-semibold">{Number(metrics.counts?.waiting ?? 0)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Called today</div>
            <div className="mt-1 text-2xl font-semibold">{Number(metrics.counts?.called ?? 0)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Avg wait to call</div>
            <div className="mt-1 text-2xl font-semibold">{Math.round(Number(metrics.avgWaitToCallSeconds ?? 0) / 60)}m</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">Avg call to serve</div>
            <div className="mt-1 text-2xl font-semibold">{Math.round(Number(metrics.avgCallToServeSeconds ?? 0) / 60)}m</div>
          </Card>
        </div>
      ) : null}

      {patientStatus ? (
        <Card className="p-4">
          <div className="text-sm font-semibold">Patient status</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">Patient</div>
              <div className="mt-1 font-semibold">{patientStatus.patient?.full_name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">#{patientStatus.patient?.id}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">In queue</div>
              <div className="mt-1 text-xl font-semibold">{patientStatus.inQueue ? "Yes" : "No"}</div>
            </div>
            {patientStatus.inQueue ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Department</div>
                  <div className="mt-1 font-semibold">{patientStatus.queue?.departmentName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Ticket #{patientStatus.queue?.ticketNumber} • Pos {patientStatus.queue?.position}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Estimated wait</div>
                  <div className="mt-1 text-xl font-semibold">{patientStatus.stats?.estimatedWaitMinutes ?? 0}m</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Ahead: {patientStatus.stats?.positionAhead ?? 0} • Avg service: {patientStatus.stats?.avgServiceMinutes ?? 0}m
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">Department queue</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">{t("position")}</th>
                <th className="p-3">{t("ticket")}</th>
                <th className="p-3">{t("fullName")}</th>
                <th className="p-3">{t("priority")}</th>
                <th className="p-3">Triage</th>
                <th className="p-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{e.position}</td>
                  <td className="p-3">#{e.ticket_number}</td>
                  <td className="p-3">{e.patient_name}</td>
                  <td className="p-3">{e.priority}</td>
                  <td className="p-3">
                    <Select
                      value={e.triageLevel || "MED"}
                      disabled={triageLoadingId === e.id || e.status !== "WAITING"}
                      onChange={async (ev) => {
                        const level = ev.target.value;
                        setTriageLoadingId(e.id);
                        try {
                          await api.post("/queue/er/triage", { queueEntryId: e.id, level });
                          toast.success("Triage updated");
                        } catch (err) {
                          toast.error(err?.response?.data?.error?.message || "Failed");
                        } finally {
                          setTriageLoadingId(null);
                        }
                      }}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MED">MED</option>
                      <option value="LOW">LOW</option>
                      <option value="NON_URGENT">NON_URGENT</option>
                    </Select>
                  </td>
                  <td className="p-3">{e.status}</td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
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

