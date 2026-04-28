import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";

export function PatientPayments() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [appointmentId, setAppointmentId] = useState("");
  const [amountCents, setAmountCents] = useState("2500");
  const [loading, setLoading] = useState(false);
  const [erAmountCents, setErAmountCents] = useState("1500");

  useEffect(() => {
    api.get("/appointments/me").then((r) => setAppointments(r.data.appointments));
    api.get("/payments/me").then((r) => setPayments(r.data.payments));
  }, []);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("payments")}</div>

      <Card className="p-4">
        <div className="text-sm font-semibold">{t("payMock")}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Appointment</div>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
            >
              <option value="">--</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} • {a.department_name} • {new Date(a.scheduled_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("amount")} (cents)</div>
            <Input value={amountCents} onChange={(e) => setAmountCents(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await api.post("/payments/mock", { appointmentId: Number(appointmentId), amountCents: Number(amountCents), currency: "USD" });
                  toast.success("Paid");
                  const { data } = await api.get("/payments/me");
                  setPayments(data.payments);
                } catch (e) {
                  toast.error(e?.response?.data?.error?.message || "Failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "..." : t("payMock")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">ER payment (mock)</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("amount")} (cents)</div>
            <Input value={erAmountCents} onChange={(e) => setErAmountCents(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await api.post("/payments/mock-er", { amountCents: Number(erAmountCents), currency: "USD" });
                  toast.success("Paid");
                  const { data } = await api.get("/payments/me");
                  setPayments(data.payments);
                } catch (e) {
                  toast.error(e?.response?.data?.error?.message || "Failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? "..." : "Pay ER fee"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">History</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">Ref</th>
                <th className="p-3">{t("amount")}</th>
                <th className="p-3">{t("status")}</th>
                <th className="p-3">{t("scheduledAt")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{p.external_ref}</td>
                  <td className="p-3">
                    {(p.amount_cents / 100).toFixed(2)} {p.currency}
                  </td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {!payments.length ? (
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

