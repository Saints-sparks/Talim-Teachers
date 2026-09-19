"use client";

import { Loader2, LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GROUP_DESCRIPTION_MAX } from "@/app/lib/chat/groupPermissions";
import type { GroupInfoEditor } from "@/hooks/messages/useGroupInfoEditor";
import GroupInfoIdentity from "./GroupInfoIdentity";

interface GroupInfoOverviewProps {
  editor: GroupInfoEditor;
  name: string;
  description: string;
  avatarUrl: string;
  canManage: boolean;
  canLeave: boolean;
  summary: string;
}

/** The "Overview" tab of the group info modal: identity, description and leave. */
export default function GroupInfoOverview({
  editor,
  name,
  description,
  avatarUrl,
  canManage,
  canLeave,
  summary,
}: GroupInfoOverviewProps) {
  const { saving, editingDescription } = editor;

  return (
    <div className="space-y-5">
      <GroupInfoIdentity
        editor={editor}
        name={name}
        avatarUrl={avatarUrl}
        canManage={canManage}
        summary={summary}
      />

      {/* Description */}
      <div className="rounded-lg border border-[#F0F0F0] p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-[#878787]">Description</p>
          {canManage && !editingDescription && (
            <button
              type="button"
              aria-label="Edit description"
              className="rounded p-1 text-[#878787] hover:bg-gray-100 hover:text-[#030E18]"
              onClick={editor.startEditingDescription}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
        {editingDescription ? (
          <div>
            <Textarea
              value={editor.descriptionDraft}
              maxLength={GROUP_DESCRIPTION_MAX}
              rows={4}
              autoFocus
              aria-label="Group description"
              className="w-full text-sm border-[#F0F0F0] focus:outline-none focus:border-[#003366]"
              onChange={(e) => editor.setDescriptionDraft(e.target.value)}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#7B7B7B]">
              <span>
                {editor.descriptionDraft.length}/{GROUP_DESCRIPTION_MAX}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={editor.cancelEditingDescription}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#003366] hover:bg-[#002244]"
                  disabled={saving !== null}
                  onClick={editor.saveDescription}
                >
                  {saving === "description" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </div>
        ) : description ? (
          <p className="text-sm text-[#545454] whitespace-pre-line break-words">{description}</p>
        ) : (
          <p className="text-sm text-[#A0A0A0]">No description</p>
        )}
      </div>

      {canLeave && (
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={saving !== null}
          onClick={editor.leaveGroup}
        >
          {saving === "leave" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut size={16} className="mr-2" />
          )}
          Leave group
        </Button>
      )}
    </div>
  );
}
