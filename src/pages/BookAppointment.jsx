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
  const departmentId = location.state?.departmentId || "";
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
    setBooking(true);
    try {
      // Mock payment
      await api.post("/payments/mock-er", { amountCents: 1500, currency: "USD" });
      // Book appointment
      await api.post("/appointments/book", {
        departmentId: Number(departmentId),
        notes: "Booked via registration"
      });
      toast.success("Appointment booked!");
      navigate("/app/appointments");
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || "Booking failed");
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
        <div className="text-lg font-semibold mb-4">Queue Preview</div>
        {queueStats ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">People ahead</div>
              <div className="text-2xl font-semibold">{queueStats.counts?.waiting ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">Estimated wait</div>
              <div className="text-2xl font-semibold">{Math.round((queueStats.avgWaitToCallSeconds ?? 0) / 60)}m</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs text-slate-500 dark:text-slate-400">Processing time</div>
              <div className="text-2xl font-semibold">{Math.round((queueStats.avgCallToServeSeconds ?? 0) / 60)}m</div>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-slate-500">No queue data available</div>
        )}

        <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Based on your profile (age: {user?.date_of_birth ? new Date().getFullYear() - new Date(user.date_of_birth).getFullYear() : "unknown"}, disabled: {user?.is_disabled ? "yes" : "no"}), you may get priority.
        </div>

        <Button
          className="w-full"
          disabled={booking}
          onClick={handleBook}
        >
          {booking ? "..." : `Pay $15 & Book Appointment`}
        </Button>
      </Card>
    </div>
  );
}