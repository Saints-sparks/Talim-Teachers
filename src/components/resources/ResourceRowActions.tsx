import React from "react";
import { Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const menuContentClass = "bg-white text-[#030E18] border border-[#D7E6F6] shadow-lg";
const menuItemClass = "cursor-pointer text-[#030E18] focus:bg-[#EAF2FB] focus:text-[#030E18]";

/** Props for {@link ResourceRowActions}. */
export interface ResourceRowActionsProps {
  /** Whether Edit and Delete are offered (the teacher may change this resource). */
  canModify: boolean;
  /** True while this resource is being deleted. */
  deleting: boolean;
  /** `desktop` is the icon-only pair in the table; `mobile` labels the menu. */
  variant: "desktop" | "mobile";
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * The actions of one resource row or card: a menu with View (and Edit when the
 * teacher may change it) and a delete button, shown only to those who may
 * delete.
 *
 * @param props - See {@link ResourceRowActionsProps}.
 * @param props.canModify - Whether Edit and Delete are offered.
 * @param props.deleting - Whether a delete is in flight.
 * @param props.variant - Table or card styling.
 * @param props.onView - Opens the file.
 * @param props.onEdit - Opens the edit dialog.
 * @param props.onDelete - Asks to delete.
 * @returns The actions element.
 */
export function ResourceRowActions({ canModify, deleting, variant, onView, onEdit, onDelete }: ResourceRowActionsProps) {
  const desktop = variant === "desktop";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {desktop ? (
            <Button variant="ghost" size="icon" aria-label="Resource actions">
              <Info />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-9 px-3 text-[#003366] dark:text-blue-300">
              <Info size={16} />
              <span className="ml-1">Actions</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={menuContentClass}>
          <DropdownMenuItem className={menuItemClass} onClick={onView}>
            View
          </DropdownMenuItem>
          {canModify && (
            <DropdownMenuItem className={menuItemClass} onClick={onEdit}>
              Edit
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canModify && (
        <Button
          variant={desktop ? "outline" : "ghost"}
          size={desktop ? "icon" : "sm"}
          className={desktop ? "border-none shadow-none" : "p-1 text-red-500 hover:bg-red-100"}
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete resource"
        >
          <Trash2 className={desktop ? "text-[#D92D20]" : ""} size={desktop ? undefined : 16} />
        </Button>
      )}
    </>
  );
}
