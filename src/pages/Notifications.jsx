import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function Notifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);

  async function load() {
    const { data } = await api.get("/notifications/me");
    setItems(data.notifications || []);
  }

  useEffect(() => {
    load().catch(() => toast.error(t("loadFailed")));
  }, []);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">{t("notifications")}</div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">{t("inbox")}</div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((n) => (
            <div key={n.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.body}</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {n.channel} - {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {!n.is_read ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await api.post(`/notifications/${n.id}/read`);
                      await load();
                    }}
                  >
                    {t("markRead")}
                  </Button>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                    {t("read")}
                  </span>
                )}
              </div>
            </div>
          ))}
          {!items.length ? <div className="p-6 text-center text-slate-500 dark:text-slate-400">{t("noNotifications")}</div> : null}
        </div>
      </Card>
    </div>
  );
}
