export type RoleMode = "course" | "class";

export type GradingUiState =
  | "idle"
  | "loading"
  | "clean"
  | "dirty"
  | "saving"
  | "generating"
  | "success"
  | "error";

export type RowStatus =
  | "not_graded"
  | "graded"
  | "ready_to_generate"
  | "generated"
  | "needs_review"
  | "failed"
  | "skipped"
  | "unavailable";

export interface ScopeOption {
  id: string;
  label: string;
}

export interface ScopedKpi {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  progress?: number;
  status?: "default" | "success" | "warning" | "danger";
}

export interface GradeRow {
  studentId: string;
  studentName: string;
  score: number | null;
  maxScore: number;
  status: RowStatus;
  lastUpdated?: string;
  generated?: boolean;
  gradePreview?: string;
  position?: number;
}

export interface GenerationResult {
  runId?: string;
  status: "completed" | "partial_failed" | "failed";
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ studentId: string; studentName?: string; reason: string }>;
}
