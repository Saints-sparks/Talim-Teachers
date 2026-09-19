"use client";

import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROUP_NAME_MAX } from "@/app/lib/chat/groupPermissions";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";
import { IMAGE_ACCEPT } from "@/components/chat-kit";
import type { GroupInfoEditor } from "@/hooks/messages/useGroupInfoEditor";

interface GroupInfoIdentityProps {
  editor: GroupInfoEditor;
  name: string;
  avatarUrl: string;
  canManage: boolean;
  /** "Class group · 12 members · 3 online" */
  summary: string;
}

/** The group's picture, name (editable for managers) and one-line summary. */
export default function GroupInfoIdentity({
  editor,
  name,
  avatarUrl,
  canManage,
  summary,
}: GroupInfoIdentityProps) {
  const { saving, fileInputRef } = editor;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <Avatar className="w-20 h-20 rounded-full">
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback
            className="text-white text-xl font-medium"
            style={{ backgroundColor: generateColorFromString(name) }}
          >
            {getUserInitials(name)}
          </AvatarFallback>
        </Avatar>
        {saving === "avatar" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {canManage && (
        <div className="mt-2 flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={editor.handlePicture}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[#003366]"
            disabled={saving !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={14} className="mr-1" />
            {avatarUrl ? "Change picture" : "Add picture"}
          </Button>
          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-600 hover:text-red-700"
              disabled={saving !== null}
              onClick={editor.removePicture}
            >
              <Trash2 size={14} className="mr-1" />
              Remove
            </Button>
          )}
        </div>
      )}

      {editor.editingName ? (
        <div className="mt-3 w-full">
          <Input
            value={editor.nameDraft}
            maxLength={GROUP_NAME_MAX}
            autoFocus
            aria-label="Group name"
            onChange={(e) => editor.setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void editor.saveName();
            }}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-[#7B7B7B]">
            <span className={editor.nameValid ? "" : "text-red-600"}>
              {editor.trimmedName.length === 0
                ? "Enter a name"
                : `${editor.trimmedName.length}/${GROUP_NAME_MAX}`}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={editor.cancelEditingName}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#003366] hover:bg-[#002244]"
                disabled={!editor.nameValid || saving !== null}
                onClick={editor.saveName}
              >
                {saving === "name" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1">
          <h2 className="text-lg text-[#030E18] font-medium break-words">{name}</h2>
          {canManage && (
            <button
              type="button"
              aria-label="Edit group name"
              className="rounded p-1 text-[#878787] hover:bg-gray-100 hover:text-[#030E18]"
              onClick={editor.startEditingName}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      )}
      <p className="text-sm text-[#7B7B7B]">{summary}</p>
    </div>
  );
}
