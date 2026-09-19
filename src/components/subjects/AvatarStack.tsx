import type { StudentPreview } from "@/hooks/curriculum/useClassPreview";

/**
 * A small overlapping stack of a class's students. With no preview (still
 * loading, or the class is empty) it shows a single neutral badge.
 *
 * @param props - Component props.
 * @param props.avatars - Up to three students.
 * @returns The stack.
 */
export function AvatarStack({ avatars }: { avatars: StudentPreview[] }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {avatars.length > 0 ? (
        avatars.map((avatar, idx) =>
          avatar.src ? (
            <img
              key={idx}
              src={avatar.src}
              alt={avatar.name}
              className="w-8 h-8 rounded-full border-2 border-white object-cover shadow -ml-1 dark:border-slate-900"
              style={{ zIndex: 10 - idx }}
            />
          ) : (
            <div
              key={idx}
              className="w-8 h-8 rounded-full border-2 border-white bg-[#003366] text-white shadow -ml-1 flex items-center justify-center text-[10px] font-semibold dark:border-slate-900"
              style={{ zIndex: 10 - idx }}
              title={avatar.name}
            >
              {avatar.initials}
            </div>
          ),
        )
      ) : (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-[#EAF2FB] text-[#003366] shadow flex items-center justify-center text-[10px] font-semibold dark:border-slate-900 dark:bg-[#10233E] dark:text-blue-200">
          ST
        </div>
      )}
    </div>
  );
}
