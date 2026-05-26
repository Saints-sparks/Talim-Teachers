import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GenerationResult } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: GenerationResult | null;
  onRetryFailed?: () => void;
  retrying?: boolean;
}

export const ValidationResultModal: React.FC<Props> = ({ open, onOpenChange, result, onRetryFailed, retrying }) => {
  if (!result) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generation Result</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Successful:</strong> {result.successful}</p>
          <p><strong>Failed:</strong> {result.failed}</p>
          <p><strong>Skipped:</strong> {result.skipped}</p>
          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700">
              {result.errors.map((error, idx) => (
                <p key={`${error.studentId}-${idx}`}>• {error.studentName || error.studentId || "Unknown"}: {error.reason}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {result.failed > 0 && onRetryFailed && (
            <Button variant="outline" onClick={onRetryFailed} disabled={retrying}>
              {retrying ? "Retrying..." : "Retry Failed Students"}
            </Button>
          )}
          <Button className="bg-[#003366] hover:bg-[#002B57]" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
