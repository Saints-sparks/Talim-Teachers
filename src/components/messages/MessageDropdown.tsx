"use client";
import React from "react";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ReplyTarget } from "./helpers";

interface MessageOptionsDropdownProps {
  msg: ReplyTarget;
  setReplyingMessage: (msg: ReplyTarget | null) => void;
}

/**
 * The per-message menu that appears on hover. It offers Reply, the one action
 * the chat implements. (Reply privately, Emojis, Send to, Download and Delete
 * used to sit here with no behaviour behind them, and "Send to" listed three
 * made-up contacts; they were removed rather than left looking real.)
 *
 * @param props - Menu props.
 * @param props.msg - The message the menu belongs to.
 * @param props.setReplyingMessage - Starts a reply to the message.
 * @returns The menu element.
 */
export default function MessageOptionsDropdown({ msg, setReplyingMessage }: MessageOptionsDropdownProps) {
  return (
    <div className="relative">
      <div className="absolute z-50 -top-1 right-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label="Message options"
              className="px-4 w-6 h-6 bg-white border border-[#F0F0F0] shadow-none rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200"
            >
              <ChevronDown className="text-[#878787]" size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-[#F0F0F0] font-manrope shadow-none" align="end">
            <DropdownMenuItem onClick={() => setReplyingMessage(msg)} className="text-[#131616]">
              Reply
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
