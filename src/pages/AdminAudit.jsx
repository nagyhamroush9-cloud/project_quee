import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function AdminAudit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/audit", { params: { limit, offset: (page - 1) * limit } })
      .then((r) => setRows(r.data?.rows || []))
      .catch(() => toast.error("Failed to load audit"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">Audit log</div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">Recent events</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-3">{r.actor_user_id ?? "—"}</td>
                      <td className="p-3">{r.action}</td>
                      <td className="p-3">
                        {r.entity_type}
                        {r.entity_id ? `#${r.entity_id}` : ""}
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                        —
                      </td>
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="text-sm text-slate-500 dark:text-slate-400">Page {page}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

