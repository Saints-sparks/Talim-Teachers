"use client";
import React from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MAX_UPLOAD_BYTES } from "@/hooks/resources/cloudinaryUpload";
import { useResourceUpload } from "@/hooks/resources/useResourceUpload";
import { UploadFormFields } from "./UploadFormFields";

/** Props for {@link UploadModal}. */
export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The "Upload Resource" dialog: choose a class, a course and a file, and the
 * file goes to Cloudinary (with a progress bar) before the resource is saved.
 * The dialog locks page scroll while open, and a failed upload returns the
 * form to an editable state with the reason shown.
 *
 * The list on the page refreshes itself when the upload succeeds.
 *
 * @param props - See {@link UploadModalProps}.
 * @param props.isOpen - Whether the dialog is showing.
 * @param props.onClose - Closes the dialog.
 * @returns The dialog element.
 */
export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const upload = useResourceUpload({ isOpen, onClose });
  const busy = upload.phase === "uploading" || upload.phase === "saving";
  const percent = Math.round(upload.progress * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && upload.cancel()}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto text-[#030E18] p-0 shadow-none border border-[#F0F0F0] [&>button:last-child]:hidden"
        data-guide="resources-upload-modal"
      >
        <div className="bg-[#003366] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-white">Upload Resource</DialogTitle>
                <DialogDescription className="text-white/80 text-sm">Share educational materials with your students</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={upload.cancel} aria-label="Close" className="text-white hover:bg-white/10 h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {upload.phase === "done" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#F0F0F0] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#003366]" />
              </div>
              <h3 className="text-lg font-semibold text-[#030E18] mb-2">Upload Successful!</h3>
              <p className="text-[#6F6F6F]">Your resource has been uploaded and is now available to students.</p>
            </div>
          ) : (
            <>
              <UploadFormFields
                name={upload.name}
                onNameChange={upload.setName}
                classId={upload.classId}
                onClassChange={upload.setClassId}
                classes={upload.classes}
                courseId={upload.courseId}
                onCourseChange={upload.selectCourse}
                courses={upload.courses}
                loading={upload.rosterLoading}
                disabled={busy}
              />

              <div className="space-y-2" data-guide="resources-upload-file">
                <Label className="text-sm font-medium text-[#030E18]">Upload File</Label>
                <div className="border-2 border-dashed border-[#F0F0F0] rounded-lg p-6 text-center hover:border-[#003366] transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const picked = e.target.files?.[0] ?? null;
                      // Let the same file be chosen again after a failure.
                      e.target.value = "";
                      upload.pickFile(picked);
                    }}
                  />
                  <label htmlFor="file-upload" className={`flex flex-col items-center space-y-3 ${busy ? "opacity-60" : "cursor-pointer"}`}>
                    <div className="w-12 h-12 bg-[#F0F0F0] rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#003366]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#030E18] break-all">{upload.file ? upload.file.name : "Choose a file"}</p>
                      <p className="text-xs text-[#878787] mt-1">PDF, DOC, Images, Videos up to {MAX_UPLOAD_BYTES / (1024 * 1024)}MB</p>
                    </div>
                  </label>
                </div>
                {busy && (
                  <div className="space-y-1" role="status" aria-live="polite">
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={upload.phase === "saving" ? 100 : percent}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0F0]"
                    >
                      <div className="h-full bg-[#003366] transition-all" style={{ width: `${upload.phase === "saving" ? 100 : percent}%` }} />
                    </div>
                    <p className="text-xs text-[#6F6F6F]">{upload.phase === "saving" ? "Saving resource…" : `Uploading… ${percent}%`}</p>
                  </div>
                )}
              </div>

              {upload.termFailed && (
                <p className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  The current term could not be loaded, so a resource cannot be filed yet. Close this dialog and try again.
                </p>
              )}
              {upload.termName && <p className="text-xs text-[#878787]">Filed under {upload.termName}.</p>}
            </>
          )}
        </div>

        {upload.phase !== "done" && (
          <div className="px-6 pb-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={upload.cancel} className="border-[#F0F0F0] hover:bg-[#F0F0F0] text-[#030E18] shadow-none">
              {busy ? "Cancel upload" : "Cancel"}
            </Button>
            <Button
              onClick={upload.submit}
              disabled={!upload.canSubmit}
              className="bg-[#003366] hover:bg-[#002244] text-white shadow-none transition-all duration-300"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {upload.phase === "saving" ? "Saving..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resource
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
