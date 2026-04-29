import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../state/auth.jsx";

export function BookAppointment() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const departmentId = location.state?.departmentId || user?.department?.id || user?.department_id || "";
  const [queueStats, setQueueStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!departmentId) {
      navigate("/app");
      return;
    }
    api
      .get(`/queue/department/${departmentId}/metrics`)
      .then((r) => setQueueStats(r.data?.metrics ?? null))
      .catch(() => setQueueStats(null))
      .finally(() => setLoading(false));
  }, [departmentId, navigate]);

  const handleBook = async () => {
    if (!departmentId) {
      toast.error(t("selectDepartment"));
      return;
    }
    setBooking(true);
    try {
      const { data } = await api.post("/appointments/book", {
        departmentId: Number(departmentId),
        notes: "Booked via registration"
      });
      await api.post("/payments/mock", {
        appointmentId: data.appointmentId,
        amountCents: 1500,
        currency: "USD"
      });
      toast.success(t("appointmentBooked"));
      navigate("/app/appointments");
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("bookingFailed"));
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("bookAppointment")}</div>

      <Card className="p-6">
        <div className="mb-4 text-lg font-semibold">{t("queuePreview")}</div>
        {queueStats ? (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("peopleAhead")}</div>
              <div className="text-2xl font-semibold">{queueStats.counts?.waiting ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("estimatedWait")}</div>
              <div className="text-2xl font-semibold">{Math.round((queueStats.avgWaitToCallSeconds ?? 0) / 60)}m</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("processingTime")}</div>
              <div className="text-2xl font-semibold">{Math.round((queueStats.avgCallToServeSeconds ?? 0) / 60)}m</div>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-slate-500">{t("noQueueData")}</div>
        )}

        <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {t("priorityHint")} {user?.date_of_birth ? new Date().getFullYear() - new Date(user.date_of_birth).getFullYear() : t("unknown")},{" "}
          {user?.is_disabled ? t("disabled") : t("normal")}.
        </div>

        <Button className="w-full" disabled={booking || !departmentId} onClick={handleBook}>
          {booking ? "..." : t("payAndBook")}
        </Button>
      </Card>
    </div>
  );
}
