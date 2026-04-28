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

  useEffect(() => {
    api.get("/appointments/doctor/today").then((r) => setAppointments(r.data.appointments || [])).finally(() => setLoading(false));
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.post("/admin/appointments/complete", { appointmentId: id });
      toast.success("Completed");
      // Refresh
      api.get("/appointments/doctor/today").then((r) => setAppointments(r.data.appointments || []));
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">Today's Appointments</div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
          Appointments for Today
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
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
                    {a.status === "BOOKED" && (
                      <Button size="sm" onClick={() => handleComplete(a.id)}>
                        Complete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!appointments.length && !loading ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                    No appointments today
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