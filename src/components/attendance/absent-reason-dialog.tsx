"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@headlessui/react"


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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reason for absent</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Textarea
              id="reason"
              placeholder="Write a student reason here..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            onClick={() => {
              onSubmit(reason)
              setReason("")
            }}
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

