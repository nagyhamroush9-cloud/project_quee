import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../state/auth.jsx";

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative min-h-full">
      <Toaster position="top-right" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
      <div className="relative grid min-h-full place-items-center p-4">
        <Card className="w-full max-w-md p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold">{t("login")}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("appName")}</div>
            </div>
            <div className="rounded-2xl bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
              HQMS
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("email")}</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.com" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("password")}</div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <label className="flex select-none items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
              />
              Remember me on this device
            </label>
          </div>

          <Button
            className="mt-5 w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await login(email, password, { remember });
                toast.success("Welcome");
                navigate("/app");
              } catch (e) {
                toast.error(e?.response?.data?.error?.message || "Login failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "..." : t("login")}
          </Button>

          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {t("register")}؟{" "}
            <Link className="text-sky-600 hover:underline" to="/register">
              {t("register")}
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="font-semibold">Admin seed</div>
            <div className="mt-1">admin@hqms.local / Admin@12345</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

