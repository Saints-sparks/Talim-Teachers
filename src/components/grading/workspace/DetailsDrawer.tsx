import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GradeRow } from "./types";
import { StatusBadge } from "./StatusBadge";

interface DetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: GradeRow | null;
  history: Array<{ label: string; score?: string; date?: string; by?: string }>;
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({ open, onOpenChange, row, history }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Student Grade Details</DialogTitle>
        </DialogHeader>

        {row ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border p-3">
              <p className="font-semibold">{row.studentName}</p>
              <p className="text-slate-500">Student ID: {row.studentId}</p>
              <div className="mt-2"><StatusBadge status={row.status} /></div>
              <p className="mt-2">Current score: {row.score ?? "-"} / {row.maxScore}</p>
              <p className="text-slate-500">Last updated: {row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : "-"}</p>
            </div>

            <div className="rounded-xl border p-3">
              <p className="mb-2 font-semibold">Audit Trail</p>
              {history.length === 0 && <p className="text-slate-500">Unavailable</p>}
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <div key={`${item.label}-${idx}`} className="rounded-lg bg-slate-50 p-2">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-slate-600">{item.score || "-"} {item.date ? `• ${item.date}` : ""} {item.by ? `• ${item.by}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p>No details available.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
