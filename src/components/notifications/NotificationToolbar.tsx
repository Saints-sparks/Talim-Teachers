"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SortKey } from "@/app/lib/notifications/inbox";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  unread: "Unread first",
};

/** Props for {@link NotificationToolbar}. */
export interface NotificationToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: SortKey;
  onSortChange: (sort: SortKey) => void;
}

/**
 * The search box and sort menu above the list.
 *
 * @param props - See {@link NotificationToolbarProps}.
 * @param props.searchQuery - The current search text.
 * @param props.onSearchChange - Called as the teacher types.
 * @param props.sortKey - The active sort order.
 * @param props.onSortChange - Called when a sort order is picked.
 * @returns The toolbar element.
 */
export function NotificationToolbar({ searchQuery, onSearchChange, sortKey, onSortChange }: NotificationToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#E8EDF5] p-4 md:flex-row">
      <div className="flex h-11 flex-1 items-center rounded-xl border border-[#DCE5F2] bg-white px-3 transition focus-within:border-[#003366] focus-within:ring-4 focus-within:ring-[#003366]/10">
        <Search className="mr-2 h-4 w-4 text-[#738195]" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-full border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          placeholder="Search notifications..."
          aria-label="Search notifications"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="rounded-full p-1 text-[#738195] transition hover:bg-[#EDF2F8] hover:text-[#102A43] dark:hover:bg-slate-700 dark:hover:text-slate-100"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 justify-between rounded-xl border-[#DCE5F2] bg-white text-[#344054] shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 md:w-44"
          >
            <span className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 rotate-90 text-[#738195]" />
              {SORT_LABELS[sortKey]}
            </span>
            <ChevronDown className="h-4 w-4 text-[#738195]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="font-manrope">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <DropdownMenuItem key={key} onClick={() => onSortChange(key)}>
              {SORT_LABELS[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
