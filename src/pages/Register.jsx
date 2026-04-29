import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useAuth } from "../state/auth.jsx";
import { api } from "../lib/api";

export function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFullName || !trimmedEmail || !password) {
      toast.error(t("fillRequiredFields"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("passwordMinLength"));
      return;
    }
    if ((role === "PATIENT" || role === "DOCTOR") && !selectedDepartment) {
      toast.error(t("selectDepartment"));
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password,
        role,
        dateOfBirth: dateOfBirth || undefined,
        isDisabled,
        hasSpecialNeeds,
        departmentId: selectedDepartment ? Number(selectedDepartment) : undefined
      });
      toast.success(t("accountCreated"));
      if (role === "PATIENT") {
        navigate("/app/book-appointment", { state: { departmentId: Number(selectedDepartment) } });
      } else {
        navigate("/app");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "PATIENT" || role === "DOCTOR") {
      api
        .get("/departments")
        .then((r) => setDepartments(r.data.departments || []))
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
      setSelectedDepartment("");
    }
  }, [role]);

  return (
    <div className="grid min-h-full place-items-center p-4">
      <Toaster position="top-right" />
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-semibold">{t("register")}</div>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("fullName")}</div>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("email")}</div>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("phone")}</div>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("role")}</div>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="PATIENT">{t("patient")}</option>
              <option value="DOCTOR">{t("doctor")}</option>
              <option value="RECEPTIONIST">{t("receptionist")}</option>
            </Select>
          </div>
          {(role === "PATIENT" || role === "DOCTOR") && (
            <div>
              <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("department")}</div>
              <Select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                <option value="">-- {t("selectDepartment")} --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {role === "PATIENT" && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("dateOfBirth")}</div>
                  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isDisabled} onChange={(e) => setIsDisabled(e.target.checked)} />
                  {t("disabled")}
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hasSpecialNeeds} onChange={(e) => setHasSpecialNeeds(e.target.checked)} />
                {t("specialNeeds")}
              </label>
            </>
          )}
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("password")}</div>
            <Input
              type="password"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button className="mt-5 w-full" type="submit" disabled={loading || ((role === "PATIENT" || role === "DOCTOR") && !selectedDepartment)}>
            {loading ? "..." : t("register")}
          </Button>
        </form>

        <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {t("haveAccount")}{" "}
          <Link className="text-sky-600 hover:underline" to="/login">
            {t("login")}
          </Link>
        </div>
      </Card>
    </div>
  );
}

