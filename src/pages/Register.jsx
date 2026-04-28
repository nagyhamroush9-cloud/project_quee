import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useAuth } from "../state/auth.jsx";

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

  useEffect(() => {
    if (role === "PATIENT") {
      fetch("/api/departments")
        .then((r) => r.json())
        .then((data) => setDepartments(data.departments || []))
        .catch(() => setDepartments([]));
    }
  }, [role]);

  return (
    <div className="grid min-h-full place-items-center p-4">
      <Toaster position="top-right" />
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-semibold">{t("register")}</div>
        <div className="mt-6 space-y-3">
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("fullName")}</div>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("email")}</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("phone")}</div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("role")}</div>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="PATIENT">{t("patient")}</option>
              <option value="DOCTOR">{t("doctor")}</option>
              <option value="RECEPTIONIST">{t("receptionist")}</option>
            </Select>
          </div>
          {role === "PATIENT" && (
            <>
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
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        <Button
          className="mt-5 w-full"
          disabled={loading || (role === "PATIENT" && !selectedDepartment)}
          onClick={async () => {
            setLoading(true);
            try {
              await register({
                fullName,
                email,
                phone: phone || undefined,
                password,
                role,
                dateOfBirth: dateOfBirth || undefined,
                isDisabled,
                hasSpecialNeeds,
                selectedDepartment: role === "PATIENT" ? selectedDepartment : undefined
              });
              toast.success("Created");
              if (role === "PATIENT") {
                navigate("/app/book-appointment", { state: { departmentId: selectedDepartment } });
              } else {
                navigate("/app");
              }
            } catch (e) {
              toast.error(e?.response?.data?.error?.message || "Register failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "..." : t("register")}
        </Button>

        <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {t("login")}؟{" "}
          <Link className="text-sky-600 hover:underline" to="/login">
            {t("login")}
          </Link>
        </div>
      </Card>
    </div>
  );
}

