import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";

export function PatientAppointments() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data.departments));
    api.get("/appointments/me").then((r) => setAppointments(r.data.appointments));
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setDoctors([]);
      setDoctorId("");
      return;
    }
    api
      .get(`/departments/${departmentId}/doctors`)
      .then((r) => setDoctors(r.data.doctors || []))
      .catch(() => setDoctors([]));
  }, [departmentId]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("appointments")}</div>

      <Card className="p-4">
        <div className="text-sm font-semibold">{t("bookAppointment")}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
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
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("doctor")}</div>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!departmentId}>
              <option value="">{doctors.length ? "--" : "No doctors mapped"}</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("scheduledAt")}</div>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("notes")}</div>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const iso = scheduledAt ? new Date(scheduledAt).toISOString() : "";
                await api.post("/appointments", {
                  departmentId: Number(departmentId),
                  doctorId: doctorId ? Number(doctorId) : undefined,
                  scheduledAt: iso,
                  notes: notes || undefined
                });
                toast.success("Booked");
                const { data } = await api.get("/appointments/me");
                setAppointments(data.appointments);
              } catch (e) {
                toast.error(e?.response?.data?.error?.message || "Failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "..." : t("bookAppointment")}
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">My appointments</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">{t("department")}</th>
                <th className="p-3">{t("doctor")}</th>
                <th className="p-3">{t("scheduledAt")}</th>
                <th className="p-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{a.department_name}</td>
                  <td className="p-3">{a.doctor_name || "—"}</td>
                  <td className="p-3">{new Date(a.scheduled_at).toLocaleString()}</td>
                  <td className="p-3">{a.status}</td>
                </tr>
              ))}
              {!appointments.length ? (
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

