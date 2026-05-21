"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  Bell,
  MessageSquare,
  GraduationCap,
  BookOpen,
  Shield,
  Palette,
  Info,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Check,
  Loader2,
  AlertCircle,
  LogOut,
  Camera,
  Key,
  RefreshCw,
  Play,
  ChevronRight,
  Users,
  BarChart2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/hooks/useAuth";
import {
  useTeacherOnboarding,
  TEACHER_ONBOARDING_STEPS,
} from "@/app/context/OnboardingContext";
import useNotifications from "@/app/hooks/useNotifications";
import { apiClient } from "@/app/lib/api/apiClient";
import { toast } from "@/components/CustomToast";
import { useTheme, Theme } from "@/providers/theme-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "account"
  | "notifications"
  | "messages"
  | "teaching"
  | "onboarding"
  | "security"
  | "appearance"
  | "about";

const SECTIONS: { id: Section; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "account",      label: "Account",              desc: "Profile and account info",            icon: UserCircle },
  { id: "notifications",label: "Notifications",        desc: "Alerts and notification settings",    icon: Bell },
  { id: "messages",     label: "Messages",             desc: "Messaging preferences",               icon: MessageSquare },
  { id: "teaching",     label: "Teaching Preferences", desc: "Workspace and display options",       icon: GraduationCap },
  { id: "onboarding",   label: "Onboarding & Guides",  desc: "Setup progress and help guides",      icon: BookOpen },
  { id: "security",     label: "Security",             desc: "Password and account security",       icon: Shield },
  { id: "appearance",   label: "Appearance",           desc: "Theme and display preferences",       icon: Palette },
  { id: "about",        label: "About",                desc: "App information and support",         icon: Info },
];

// ─── localStorage preferences ─────────────────────────────────────────────────

const settingsKey = (userId: string) => `teacher_settings_${userId}`;

const defaultPrefs = {
  notifications: {
    announcements:       true,
    attendance:          true,
    grading:             true,
    resources:           true,
    messages:            true,
    inApp:               true,
    email:               false,
    quietHoursEnabled:   false,
    quietStart:          "22:00",
    quietEnd:            "07:00",
  },
  messages: {
    groupNotifications:  true,
    unreadBadge:         true,
    soundEnabled:        false,
    showOnlineStatus:    true,
    defaultFilter:       "all" as "all" | "private" | "groups",
  },
  teaching: {
    landingPage:         "dashboard"  as "dashboard" | "timetable" | "attendance" | "messages",
    gradingView:         "course"     as "course" | "class",
    attendanceMode:      "mark"       as "mark" | "view",
    timetableDisplay:    "week"       as "week" | "today",
    resourceDisplay:     "grid"       as "grid" | "list",
  },
  guides: {
    showAppTips:         true,
  },
};

type Prefs = typeof defaultPrefs;

function useTeacherPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(settingsKey(userId));
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs((prev) => ({
          notifications: { ...prev.notifications, ...parsed.notifications },
          messages:      { ...prev.messages,      ...parsed.messages },
          teaching:      { ...prev.teaching,      ...parsed.teaching },
          guides:        { ...prev.guides,        ...parsed.guides },
        }));
      }
    } catch {}
    setLoaded(true);
  }, [userId]);

  const save = useCallback(
    (updates: Partial<Prefs>) => {
      if (!userId) return;
      setPrefs((prev) => {
        const next = { ...prev, ...updates };
        try { localStorage.setItem(settingsKey(userId), JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [userId],
  );

  return { prefs, save, loaded };
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</h3>
      {action}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
          checked ? "bg-[#003366] dark:bg-blue-600" : "bg-gray-200 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function ActionCard({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div className="mt-auto">{action}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>
    </div>
  );
}

function SelectRow<T extends string>({
  label,
  desc,
  value,
  options,
  onChange,
}: {
  label: string;
  desc?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [saving, setSaving]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast.error("New passwords do not match."); return; }
    if (next.length < 8)  { toast.error("Password must be at least 8 characters."); return; }

    setSaving(true);
    try {
      await apiClient.post("/settings/security/change-password", {
        currentPassword: current,
        newPassword:     next,
        confirmPassword: confirm,
      });
      toast.success("Password updated successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-slate-100">Change Password</h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {[
            { label: "Current Password", val: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
            { label: "New Password",     val: next,    set: setNext,    show: showNext,    toggle: () => setShowNext((v) => !v) },
            { label: "Confirm New Password", val: confirm, set: setConfirm, show: showNext, toggle: () => setShowNext((v) => !v) },
          ].map(({ label, val, set, show, toggle }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                {label}
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-[#003366] dark:bg-blue-600 text-white hover:bg-[#002244] dark:hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Section 1: Account ───────────────────────────────────────────────────────

function AccountSection() {
  const { user, teacherData, isLoading } = useAppContext();
  const { logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fullName   = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Teacher";
  const employeeId = teacherData?.employeeId || teacherData?.staffId || "—";
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const isActive   = user?.isActive !== false;

  const classCount   = (teacherData?.assignedClasses?.length ?? teacherData?.classTeacherClasses?.length) ?? 0;
  const subjectCount = (teacherData?.assignedCourses?.length ?? teacherData?.classTeacherCourses?.length) ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Account" desc="View and manage your personal account information." />

      <Card>
        <CardHeader title="Profile" />
        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-5 mb-5">
            {/* Avatar */}
            <div className="shrink-0 self-start">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#EAF2FB] dark:border-slate-700">
                {user?.userAvatar ? (
                  <img src={user.userAvatar} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#003366] dark:bg-blue-700 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {(user?.firstName?.[0] ?? "T").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-1 min-w-0">
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow
                label="Role"
                value={
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#E7F0FF] dark:bg-blue-900/30 text-[#003366] dark:text-blue-400 text-xs font-semibold capitalize">
                    {user?.role ?? "Teacher"}
                  </span>
                }
              />
              <InfoRow label="Email Address" value={user?.email ?? "—"} />
              <InfoRow label="Employee ID"   value={employeeId} />
              <InfoRow label="Phone Number"  value={user?.phoneNumber ?? "—"} />
              <InfoRow label="Joined"        value={joinedDate} />
            </div>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#EFF5FF] dark:bg-blue-900/20 border border-[#BFD7FF] dark:border-blue-800/50">
            <AlertCircle className="w-4 h-4 text-[#003366] dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-[#003366] dark:text-blue-300 leading-relaxed">
              Employment, class assignments, and subjects are managed by your school administrator.
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader title="Account Actions" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ActionCard
            icon={<UserCircle size={22} />}
            iconBg="bg-[#E7F0FF] dark:bg-blue-900/30"
            iconColor="text-[#003366] dark:text-blue-400"
            title="View Profile"
            desc="View your full profile and teaching assignments"
            action={
              <Link
                href="/profile"
                className="text-sm text-[#003366] dark:text-blue-400 font-semibold hover:underline"
              >
                Open Profile
              </Link>
            }
          />
          <ActionCard
            icon={<Camera size={22} />}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            title="Change Photo"
            desc="Update your profile photo that appears across Talim"
            action={
              <Link
                href="/profile"
                className="text-sm text-[#003366] dark:text-blue-400 font-semibold hover:underline"
              >
                Upload Photo
              </Link>
            }
          />
          <ActionCard
            icon={<Key size={22} />}
            iconBg="bg-purple-50 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            title="Change Password"
            desc="Update your password to keep your account secure"
            action={
              <button
                onClick={() => setShowPasswordModal(true)}
                className="text-sm text-[#003366] dark:text-blue-400 font-semibold hover:underline"
              >
                Change Password
              </button>
            }
          />
        </div>
      </Card>

      {/* Account Summary */}
      <Card>
        <CardHeader title="Account Summary" />
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            label="Classes Assigned"
            value={isLoading ? "…" : classCount}
            sub="Active classes"
            icon={<Users size={20} />}
            color="text-[#003366] dark:text-blue-400"
          />
          <SummaryCard
            label="Subjects Teaching"
            value={isLoading ? "…" : subjectCount}
            sub="Active subjects"
            icon={<BookOpen size={20} />}
            color="text-purple-600 dark:text-purple-400"
          />
          <SummaryCard
            label="Students Teaching"
            value={isLoading ? "…" : (teacherData?.totalStudents ?? "—")}
            sub="Total students"
            icon={<GraduationCap size={20} />}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            label="Account Status"
            value={isActive ? "Active" : "Inactive"}
            sub={isActive ? "Your account is active" : "Account inactive"}
            icon={<Shield size={20} />}
            color={isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
          />
        </div>
      </Card>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

// ─── Section 2: Notifications ────────────────────────────────────────────────

function NotificationsSection() {
  const { user } = useAppContext();
  const { counts, markAllAsRead, loading } = useNotifications();
  const { prefs, save } = useTeacherPrefs(user?.userId);

  const n = prefs.notifications;

  const setN = (patch: Partial<typeof n>) =>
    save({ notifications: { ...n, ...patch } });

  return (
    <div className="space-y-6">
      <SectionHeader title="Notifications" desc="Control your alerts and notification preferences." />

      <Card>
        <CardHeader
          title="Notification Categories"
          action={
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {counts.unread} unread
            </span>
          }
        />
        <div className="px-5">
          <ToggleRow label="School announcements"       desc="Alerts from your school admin"          checked={n.announcements}  onChange={(v) => setN({ announcements: v })} />
          <ToggleRow label="Attendance alerts"          desc="Attendance reminders and updates"        checked={n.attendance}     onChange={(v) => setN({ attendance: v })} />
          <ToggleRow label="Grading & result alerts"    desc="New assessments and grade updates"       checked={n.grading}        onChange={(v) => setN({ grading: v })} />
          <ToggleRow label="Resource & curriculum"      desc="New materials and curriculum updates"    checked={n.resources}      onChange={(v) => setN({ resources: v })} />
          <ToggleRow label="Message notifications"      desc="New messages from students or groups"   checked={n.messages}       onChange={(v) => setN({ messages: v })} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Delivery" />
        <div className="px-5">
          <ToggleRow label="In-app notifications" desc="Show alerts inside the app"    checked={n.inApp}  onChange={(v) => setN({ inApp: v })} />
          <ToggleRow label="Email notifications"  desc="Receive updates via email"    checked={n.email}  onChange={(v) => setN({ email: v })} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Quiet Hours" />
        <div className="px-5">
          <ToggleRow
            label="Enable quiet hours"
            desc="Suppress notifications during set times"
            checked={n.quietHoursEnabled}
            onChange={(v) => setN({ quietHoursEnabled: v })}
          />
          {n.quietHoursEnabled && (
            <div className="flex gap-6 py-3">
              {(["quietStart", "quietEnd"] as const).map((field) => (
                <div key={field}>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                    {field === "quietStart" ? "Start time" : "End time"}
                  </p>
                  <input
                    type="time"
                    value={n[field]}
                    onChange={(e) => setN({ [field]: e.target.value })}
                    className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-5 flex flex-wrap gap-3">
          <button
            onClick={() => markAllAsRead().then(() => toast.success("All notifications marked as read."))}
            disabled={loading || counts.unread === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#003366] dark:bg-blue-600 text-white hover:bg-[#002244] dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
            Mark all as read
          </button>
          <Link
            href="/notifications"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Open Notifications <ChevronRight size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}

// ─── Section 3: Messages ─────────────────────────────────────────────────────

function MessagesSection() {
  const { user } = useAppContext();
  const { prefs, save } = useTeacherPrefs(user?.userId);

  const m = prefs.messages;
  const setM = (patch: Partial<typeof m>) =>
    save({ messages: { ...m, ...patch } });

  return (
    <div className="space-y-6">
      <SectionHeader title="Messages" desc="Manage your messaging preferences." />

      <Card>
        <CardHeader title="Chat Preferences" />
        <div className="px-5">
          <ToggleRow label="Group chat notifications"  desc="Alerts for new group messages"        checked={m.groupNotifications} onChange={(v) => setM({ groupNotifications: v })} />
          <ToggleRow label="Show unread badge"         desc="Badge count on sidebar icon"          checked={m.unreadBadge}        onChange={(v) => setM({ unreadBadge: v })} />
          <ToggleRow label="Play sound for new messages" desc="Audio alert for incoming messages"  checked={m.soundEnabled}       onChange={(v) => setM({ soundEnabled: v })} />
          <ToggleRow label="Show online status"        desc="Let others see when you're online"   checked={m.showOnlineStatus}   onChange={(v) => setM({ showOnlineStatus: v })} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Default Chat Filter" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default view"
            desc="Which chat list to show first"
            value={m.defaultFilter}
            options={[
              { value: "all",     label: "All Chats" },
              { value: "private", label: "Private" },
              { value: "groups",  label: "Groups" },
            ]}
            onChange={(v) => setM({ defaultFilter: v })}
          />
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#003366] dark:bg-blue-600 text-white hover:bg-[#002244] dark:hover:bg-blue-700 transition-colors"
          >
            Open Messages <ChevronRight size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}

// ─── Section 4: Teaching Preferences ─────────────────────────────────────────

function TeachingSection() {
  const { user } = useAppContext();
  const { prefs, save } = useTeacherPrefs(user?.userId);

  const t = prefs.teaching;
  const setT = (patch: Partial<typeof t>) =>
    save({ teaching: { ...t, ...patch } });

  return (
    <div className="space-y-6">
      <SectionHeader title="Teaching Preferences" desc="Personalise your teaching workspace and display options." />

      <Card>
        <CardHeader title="Navigation" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default landing page"
            desc="First page shown after login"
            value={t.landingPage}
            options={[
              { value: "dashboard",   label: "Dashboard" },
              { value: "timetable",   label: "Timetable" },
              { value: "attendance",  label: "Attendance" },
              { value: "messages",    label: "Messages" },
            ]}
            onChange={(v) => setT({ landingPage: v })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Grading" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default grading view"
            desc="How you prefer to enter grades"
            value={t.gradingView}
            options={[
              { value: "course", label: "Course Teacher" },
              { value: "class",  label: "Class Teacher" },
            ]}
            onChange={(v) => setT({ gradingView: v })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Attendance" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default attendance mode"
            desc="Mark or view attendance on open"
            value={t.attendanceMode}
            options={[
              { value: "mark", label: "Mark Attendance" },
              { value: "view", label: "View Attendance" },
            ]}
            onChange={(v) => setT({ attendanceMode: v })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Display" />
        <div className="px-5 py-1">
          <SelectRow
            label="Timetable display"
            desc="Week view or today's classes"
            value={t.timetableDisplay}
            options={[
              { value: "week",  label: "Week View" },
              { value: "today", label: "Today View" },
            ]}
            onChange={(v) => setT({ timetableDisplay: v })}
          />
          <SelectRow
            label="Resource display"
            desc="How resources are listed"
            value={t.resourceDisplay}
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
            onChange={(v) => setT({ resourceDisplay: v })}
          />
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Preferences are stored locally on this device and apply immediately.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Section 5: Onboarding & Guides ──────────────────────────────────────────

function OnboardingSection() {
  const { user } = useAppContext();
  const { prefs, save } = useTeacherPrefs(user?.userId);
  const onboarding = useTeacherOnboarding();

  const { progressPercent, completedCount, totalCount, completedSteps, dismissSetup } = onboarding;

  const resetGuide = () => {
    if (!user?.userId) return;
    try {
      localStorage.removeItem(`teacher_onboarding_${user.userId}`);
      toast.success("Guide prompts reset. Refresh to see changes.");
    } catch {}
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Onboarding & Guides" desc="Setup progress, completed steps and help guides." />

      {/* Progress */}
      <Card>
        <CardHeader title="Setup Progress" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {completedCount} of {totalCount} steps completed
            </span>
            <span className="text-sm font-bold text-[#003366] dark:text-blue-400">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#003366] dark:bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader title="Setup Steps" />
        <div className="divide-y divide-gray-50 dark:divide-slate-700">
          {TEACHER_ONBOARDING_STEPS.map((step) => {
            const done = completedSteps.includes(step.id);
            return (
              <div key={step.id} className="flex items-start gap-3 px-5 py-3.5">
                {done ? (
                  <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <Circle size={18} className="text-gray-300 dark:text-slate-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? "text-gray-500 dark:text-slate-500 line-through" : "text-gray-800 dark:text-slate-200"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{step.description}</p>
                </div>
                {!done && (
                  <Link
                    href={step.href}
                    className="text-xs text-[#003366] dark:text-blue-400 font-semibold hover:underline shrink-0"
                  >
                    Go <ChevronRight size={12} className="inline" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Guide controls */}
      <Card>
        <CardHeader title="Guide Settings" />
        <div className="px-5">
          <ToggleRow
            label="Show app guide tips"
            desc="In-app tooltips and walkthrough prompts"
            checked={prefs.guides.showAppTips}
            onChange={(v) => save({ guides: { showAppTips: v } })}
          />
        </div>
      </Card>

      <Card>
        <div className="p-5 flex flex-wrap gap-3">
          <Link
            href="/onboarding/setup"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#003366] dark:bg-blue-600 text-white hover:bg-[#002244] dark:hover:bg-blue-700 transition-colors"
          >
            <Play size={14} />
            Open Setup Checklist
          </Link>
          <button
            onClick={resetGuide}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} />
            Reset Guide Prompts
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Section 6: Security ─────────────────────────────────────────────────────

function SecuritySection() {
  const { logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHeader title="Security" desc="Manage your password and account security." />

      <Card>
        <CardHeader title="Password" />
        <div className="p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Change Password</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Use a strong password of at least 8 characters.
            </p>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-[#003366] dark:bg-blue-600 text-white hover:bg-[#002244] dark:hover:bg-blue-700 transition-colors shrink-0"
          >
            <Key size={14} /> Change
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Active Session" />
        <div className="p-5">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Current session active</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                You are currently logged in on this device.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Two-Factor Authentication" />
        <div className="p-5">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Two-factor authentication is coming soon. Your account is secured by password.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account Actions" />
        <div className="p-5">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={14} />
            Logout Account
          </button>
        </div>
      </Card>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

// ─── Section 7: Appearance ───────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Light",  desc: "Clean white interface",         icon: Sun },
  { value: "dark",   label: "Dark",   desc: "Easy on the eyes at night",     icon: Moon },
  { value: "system", label: "System", desc: "Follows device preference",     icon: Monitor },
];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <SectionHeader title="Appearance" desc="Choose how Talim Teachers looks on this device." />

      <Card>
        <CardHeader title="Theme" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEME_OPTIONS.map(({ value, label, desc, icon: Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-[#003366] dark:border-blue-500 bg-[#EEF3F9] dark:bg-slate-700"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selected
                      ? "bg-[#003366] dark:bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300"
                  }`}
                >
                  <Icon size={24} />
                </div>
                <div className="text-center">
                  <p
                    className={`text-sm font-semibold ${
                      selected
                        ? "text-[#003366] dark:text-blue-400"
                        : "text-gray-700 dark:text-slate-200"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{desc}</p>
                </div>
                {selected && (
                  <div className="w-5 h-5 rounded-full bg-[#003366] dark:bg-blue-600 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Theme preference is stored locally on this device and does not sync across browsers.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Section 8: About ────────────────────────────────────────────────────────

function AboutSection() {
  const { user } = useAppContext();

  const schoolName = user?.schoolName || "Your School";
  const schoolLogo = user?.schoolLogo || null;

  return (
    <div className="space-y-6">
      <SectionHeader title="About" desc="App information and support." />

      <Card>
        <CardHeader title="School" />
        <div className="p-5 flex items-center gap-4">
          {schoolLogo ? (
            <img src={schoolLogo} alt={schoolName} className="w-12 h-12 rounded-lg object-contain border border-gray-100 dark:border-slate-700" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#003366] dark:bg-blue-700 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">{schoolName.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{schoolName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              School info is managed by your administrator.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Application" />
        <div className="px-5 py-2 divide-y divide-gray-50 dark:divide-slate-700">
          {[
            { label: "App",        value: "Talim Teachers" },
            { label: "Version",    value: "2.0.0" },
            { label: "Platform",   value: "Web (Next.js)" },
            { label: "Support",    value: "support@talim.io" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-3">
              <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-5 flex flex-wrap gap-3">
          <a
            href="mailto:support@talim.io"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </Card>
    </div>
  );
}

// ─── Section Map ─────────────────────────────────────────────────────────────

const SECTION_MAP: Record<Section, React.ComponentType> = {
  account:       AccountSection,
  notifications: NotificationsSection,
  messages:      MessagesSection,
  teaching:      TeachingSection,
  onboarding:    OnboardingSection,
  security:      SecuritySection,
  appearance:    AppearanceSection,
  about:         AboutSection,
};

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAppContext();
  const [active, setActive] = useState<Section>("account");

  const ActiveSection = SECTION_MAP[active];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Manage your account, preferences and teaching workspace
          </p>
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#003366] dark:text-blue-400 hover:underline"
        >
          <UserCircle size={16} />
          View Profile
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar nav */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
          <nav className="p-2 flex-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-colors ${
                    isActive
                      ? "bg-[#EEF3F9] dark:bg-slate-700 text-[#003366] dark:text-blue-400"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      isActive ? "text-[#003366] dark:text-blue-400" : "text-gray-400 dark:text-slate-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isActive ? "text-[#003366] dark:text-blue-400" : "text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800">
            <p className="text-[10px] text-gray-400 dark:text-slate-600">Talim Teachers v2.0</p>
          </div>
        </aside>

        {/* Mobile horizontal tabs */}
        <div className="md:hidden w-full">
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 gap-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-[#003366] dark:border-blue-500 text-[#003366] dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-slate-400"
                  }`}
                >
                  <Icon size={14} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Mobile content */}
          <div className="overflow-y-auto p-4">
            <ActiveSection />
          </div>
        </div>

        {/* Desktop content */}
        <main className="hidden md:block flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
          <div className="max-w-3xl mx-auto px-8 py-8">
            <ActiveSection />
          </div>
        </main>
      </div>
    </div>
  );
}
