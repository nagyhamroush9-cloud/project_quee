import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useAuth } from "../state/auth.jsx";

export function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth ? user.date_of_birth.split("T")[0] : "");
  const [isDisabled, setIsDisabled] = useState(Boolean(user?.is_disabled));
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(Boolean(user?.has_special_needs));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.fullName || "");
      setPhone(user.phone || "");
      setDateOfBirth(user.date_of_birth ? user.date_of_birth.split("T")[0] : "");
      setIsDisabled(Boolean(user.is_disabled));
      setHasSpecialNeeds(Boolean(user.has_special_needs));
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put("/users/me", {
        fullName,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        isDisabled,
        hasSpecialNeeds
      });
      setUser(data.user);
      toast.success(t("profileUpdated"));
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || t("updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("profile")}</div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("fullName")}</div>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("email")}</div>
            <Input value={user?.email || ""} disabled />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("phone")}</div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
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
        </div>

        <Button className="mt-6" disabled={loading} onClick={handleSave}>
          {loading ? "..." : t("save")}
        </Button>
      </Card>
    </div>
  );
}
