import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function DoctorAppointments() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAppointments() {
    const { data } = await api.get("/appointments/doctor/today");
    setAppointments(data.appointments || []);
  }

  useEffect(() => {
    loadAppointments()
      .catch(() => toast.error(t("loadFailed")))
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.post(`/appointments/${id}/complete`);
      toast.success(t("completed"));
      await loadAppointments();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("completeFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("todaysAppointments")}</div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
          {t("appointmentsForToday")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">{t("time")}</th>
                <th className="p-3">{t("patient")}</th>
                <th className="p-3">{t("department")}</th>
                <th className="p-3">{t("status")}</th>
                <th className="p-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{new Date(a.scheduled_at).toLocaleTimeString()}</td>
                  <td className="p-3">{a.patient_name}</td>
                  <td className="p-3">{a.department_name}</td>
                  <td className="p-3">{a.status}</td>
                  <td className="p-3">
                    {a.status === "BOOKED" ? (
                      <Button size="sm" onClick={() => handleComplete(a.id)}>
                        {t("complete")}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!appointments.length && !loading ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                    {t("noAppointmentsToday")}
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
