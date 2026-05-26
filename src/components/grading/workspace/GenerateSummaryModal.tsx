import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  termName: string;
  studentCount: number;
  warnings: string[];
  blockers: string[];
  onConfirm: () => void;
  loading?: boolean;
}

export const GenerateSummaryModal: React.FC<Props> = ({
  open,
  onOpenChange,
  className,
  termName,
  studentCount,
  warnings,
  blockers,
  onConfirm,
  loading,
}) => {
  const blocked = blockers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Class Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p><strong>Class:</strong> {className || "-"}</p>
          <p><strong>Term:</strong> {termName || "-"}</p>
          <p><strong>Student count:</strong> {studentCount}</p>

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="font-medium text-amber-800">Warnings</p>
              {warnings.map((w) => <p key={w} className="text-amber-700">• {w}</p>)}
            </div>
          )}

          {blocked && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-medium text-red-800">Blocked by prerequisites</p>
              {blockers.map((b) => <p key={b} className="text-red-700">• {b}</p>)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={blocked || loading} className="bg-[#003366] hover:bg-[#002B57]" onClick={onConfirm}>
            {loading ? "Generating..." : "Generate Class Summary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
