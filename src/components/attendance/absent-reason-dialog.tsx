"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface AbsentReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string | null
  onSubmit: (reason: string) => void
}

export function AbsentReasonDialog({
  open,
  onOpenChange,
  studentId,
  onSubmit,
}: AbsentReasonDialogProps) {
  const [reason, setReason] = useState("")

  const handleSubmit = () => {
    // Check if the reason is not empty
    if (!reason.trim()) return

    onSubmit(reason)
    setReason("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reason for absence</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <textarea
              id="reason"
              placeholder="Write a student reason here..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={!reason.trim()}
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
