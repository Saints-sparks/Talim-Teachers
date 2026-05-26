import React from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, MinusCircle, RotateCcw, XCircle } from "lucide-react";
import { RowStatus } from "./types";

const STATUS_STYLE: Record<RowStatus, string> = {
  not_graded: "bg-slate-100 text-slate-700",
  graded: "bg-green-100 text-green-700",
  ready_to_generate: "bg-blue-100 text-blue-700",
  generated: "bg-emerald-100 text-emerald-700",
  needs_review: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-orange-100 text-orange-700",
  unavailable: "bg-slate-200 text-slate-600",
};

const STATUS_LABEL: Record<RowStatus, string> = {
  not_graded: "Not graded",
  graded: "Graded",
  ready_to_generate: "Ready to generate",
  generated: "Generated",
  needs_review: "Needs review",
  failed: "Failed",
  skipped: "Skipped",
  unavailable: "Unavailable",
};

const STATUS_ICON: Record<RowStatus, React.ReactNode> = {
  not_graded: <Clock3 className="h-3 w-3" />,
  graded: <CheckCircle2 className="h-3 w-3" />,
  ready_to_generate: <RotateCcw className="h-3 w-3" />,
  generated: <CheckCircle2 className="h-3 w-3" />,
  needs_review: <AlertCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  skipped: <MinusCircle className="h-3 w-3" />,
  unavailable: <Loader2 className="h-3 w-3" />,
};

export const StatusBadge = ({ status }: { status: RowStatus }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
    {STATUS_ICON[status]}
    {STATUS_LABEL[status]}
  </span>
);
