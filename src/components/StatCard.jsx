import React from "react";
import { Card } from "./Card";

export function StatCard({ label, value, hint }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </Card>
  );
}

