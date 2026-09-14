"use client";
import { useMemo, useState } from "react";
import { Download, FileText, Link2 } from "lucide-react";
import { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import { Lightbox, attachmentKind, extractLinks, formatBytes } from "@/components/chat-kit";

interface GroupMediaProps {
  /** The conversation's loaded messages, oldest first. */
  messages: ChatMessageView[];
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[#878787]">
        {title} <span className="text-[#A0A0A0]">({count})</span>
      </h3>
      {children}
    </section>
  );
}

/**
 * Photos, videos, documents and links shared in the group, taken from the
 * messages already loaded (no extra request), newest first.
 */
export default function GroupMedia({ messages }: GroupMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { images, videos, documents, links } = useMemo(() => {
    const stored = messages.filter((m) => m.status === "sent").reverse();
    const collect = (match: (kind: string) => boolean) =>
      stored.flatMap((message) =>
        message.attachments
          .filter((attachment) => attachment.url && match(attachmentKind(attachment)))
          .map((attachment) => ({ attachment, message })),
      );
    return {
      images: collect((kind) => kind === "image"),
      videos: collect((kind) => kind === "video"),
      documents: collect((kind) => kind === "document" || kind === "file"),
      links: stored.flatMap((message) => extractLinks(message.text).map((url) => ({ url, message }))),
    };
  }, [messages]);

  const total = images.length + videos.length + documents.length + links.length;

  if (total === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-[#7B7B7B]">No photos, videos, documents or links yet</p>
        <p className="mt-1 text-xs text-[#A0A0A0]">
          From loaded messages. Scroll up in the chat to load older ones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#A0A0A0]">From loaded messages</p>

      <Section title="Photos" count={images.length}>
        <div className="grid grid-cols-3 gap-1.5">
          {images.map(({ attachment }, i) => (
            <button
              key={`${attachment.url}-${i}`}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="aspect-square overflow-hidden rounded-md bg-gray-100"
              aria-label={`Open photo ${i + 1} of ${images.length}`}
            >
              <img
                src={attachment.url}
                alt={attachment.name || "Photo"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        <Lightbox
          images={images.map(({ attachment }) => ({ url: attachment.url, name: attachment.name }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      </Section>

      <Section title="Videos" count={videos.length}>
        <div className="grid grid-cols-2 gap-2">
          {videos.map(({ attachment, message }, i) => (
            <div key={`${attachment.url}-${i}`} className="space-y-1">
              <video
                src={attachment.url}
                controls
                preload="metadata"
                playsInline
                className="aspect-video w-full rounded-md bg-black"
              />
              <p className="truncate text-xs text-[#7B7B7B]">
                {message.senderName} · {when(message.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Documents" count={documents.length}>
        <ul className="space-y-1.5">
          {documents.map(({ attachment, message }, i) => (
            <li
              key={`${attachment.url}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-[#F0F0F0] px-2.5 py-2"
            >
              <FileText size={18} className="flex-shrink-0 text-[#878787]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#030E18]" title={attachment.name}>
                  {attachment.name || "File"}
                </p>
                <p className="text-xs text-[#7B7B7B]">
                  {[formatBytes(attachment.size), message.senderName, when(message.createdAt)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                download={attachment.name || true}
                className="rounded-full p-2 text-[#878787] hover:bg-gray-100 hover:text-[#030E18]"
                aria-label={`Download ${attachment.name || "file"}`}
                title="Download"
              >
                <Download size={16} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Links" count={links.length}>
        <ul className="space-y-1.5">
          {links.map(({ url, message }, i) => (
            <li key={`${url}-${i}`} className="flex items-center gap-2 rounded-lg border border-[#F0F0F0] px-2.5 py-2">
              <Link2 size={16} className="flex-shrink-0 text-[#878787]" aria-hidden />
              <div className="min-w-0 flex-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm text-[#003366] hover:underline"
                >
                  {url}
                </a>
                <p className="text-xs text-[#7B7B7B]">
                  {message.senderName} · {when(message.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
