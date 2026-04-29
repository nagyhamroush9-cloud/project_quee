import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";

export function DoctorSchedule() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    api
      .get("/appointments/doctor/today")
      .then((r) => setAppointments(r.data.appointments || []))
      .catch(() => toast.error(t("loadFailed")));
  }, []);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("appointments")}</div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">{t("today")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">{t("scheduledAt")}</th>
                <th className="p-3">{t("department")}</th>
                <th className="p-3">{t("fullName")}</th>
                <th className="p-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{new Date(a.scheduled_at).toLocaleString()}</td>
                  <td className="p-3">{a.department_name}</td>
                  <td className="p-3">{a.patient_name}</td>
                  <td className="p-3">{a.status}</td>
                </tr>
              ))}
              {!appointments.length ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
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
