"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { roleLabel } from "@/app/lib/chat/groupPermissions";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";
import ChatInfoDialog from "./ChatInfoDialog";

export interface ContactInfo {
  name: string;
  avatar?: string | null;
  role?: string;
  isOnline?: boolean;
}

interface ContactCardProps {
  open: boolean;
  onClose: () => void;
  contact: ContactInfo;
}

/** Who you're talking to in a direct message. */
export default function ContactCard({ open, onClose, contact }: ContactCardProps) {
  return (
    <ChatInfoDialog open={open} onClose={onClose} title="Contact info" className="sm:max-w-xs">
      <div className="flex flex-col items-center pb-2 text-center">
        <div className="relative">
          <Avatar className="h-20 w-20 rounded-full">
            <AvatarImage src={contact.avatar || undefined} alt="" />
            <AvatarFallback
              className="text-xl font-medium text-white"
              style={{ backgroundColor: generateColorFromString(contact.name) }}
            >
              {getUserInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          {contact.isOnline && (
            <span
              className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"
              aria-hidden
            />
          )}
        </div>
        <p className="mt-3 text-lg font-medium text-[#030E18] break-words">{contact.name}</p>
        <p className="text-sm text-[#7B7B7B]">{roleLabel(contact.role)}</p>
        <p className={`mt-1 text-xs ${contact.isOnline ? "text-green-600" : "text-[#A0A0A0]"}`}>
          {contact.isOnline ? "Online" : "Offline"}
        </p>
      </div>
    </ChatInfoDialog>
  );
}
