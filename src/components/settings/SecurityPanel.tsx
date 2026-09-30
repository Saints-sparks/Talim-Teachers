"use client";

import React, { useState } from "react";
import { toast } from "@/components/CustomToast";
import { ConfirmSheet } from "@/components/tl/ConfirmSheet";
import { pill, pillTone, rowButton } from "@/components/tl/styles";
import { policySummary } from "@/app/lib/passwordPolicy";
import { getErrorMessage } from "@/lib/apiError";
import { useInvalidateSessions, usePasswordPolicy, useRevokeOtherSessions, useRevokeSession, useSessions } from "@/hooks/settings/useAccount";
import { revokedOthersMessage, sessionDescription, sessionLabel, sortSessions } from "@/hooks/settings/settings.logic";
import type { AuthSession } from "@/types/inboxSettings";
import { ChangePasswordSheet } from "./ChangePasswordSheet";
import { LinkRow, PanelError, PanelSkeleton, SettingsGroup, ValueRow } from "./SettingsRows";

/**
 * One signed-in device: what it is, where and when it was last used, and a
 * "This device" pill or a "Sign out" button.
 *
 * @param props - The session and its action.
 * @param props.session - One entry of `GET /auth/sessions`.
 * @param props.showBadge - True for the current session when the server identified it.
 * @param props.busy - True while this session is being signed out.
 * @param props.onSignOut - Signs this session out.
 * @returns The row.
 */
function SessionRow({ session, showBadge, busy, onSignOut }: { session: AuthSession; showBadge: boolean; busy: boolean; onSignOut: () => void }) {
  const label = sessionLabel(session);
  return (
    <ValueRow
      label={label}
      description={sessionDescription(session)}
      value={null}
      action={
        showBadge ? (
          <span className={`${pill} ${pillTone.success} shrink-0`}>This device</span>
        ) : (
          <button type="button" className={`${rowButton} shrink-0`} onClick={onSignOut} disabled={busy} aria-label={`Sign out of ${label}`}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        )
      }
    />
  );
}

/**
 * Settings → Security: change the password (the sheet checks the backend's
 * real policy), the list of signed-in devices with "Sign out" on each other
 * one, and "Sign out of other devices" behind a confirmation. Two-step
 * sign-in is not offered (decision 5 of Round 4).
 *
 * @returns The panel content.
 */
export function SecurityPanel() {
  const policy = usePasswordPolicy();
  const sessions = useSessions();
  const revokeOne = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const invalidateSessions = useInvalidateSessions();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const list = sortSessions(sessions.data ?? []);
  const hasCurrent = list.some((session) => session.current);
  const others = list.filter((session) => !session.current);

  /**
   * Signs one other device out.
   *
   * @param id - The session.
   */
  const signOut = (id: string) => {
    setRevokingId(id);
    revokeOne.mutate(id, {
      onSuccess: () => toast.success("Signed out of that device."),
      onError: (error) => toast.error(getErrorMessage(error, "We couldn't sign that device out. Please try again.")),
      onSettled: () => setRevokingId(null),
    });
  };

  /** Signs out every other device, after the confirmation. */
  const signOutOthers = () => {
    revokeOthers.mutate(undefined, {
      onSuccess: ({ revoked }) => {
        toast.success(revokedOthersMessage(revoked));
        setConfirmOthers(false);
      },
      onError: (error) => toast.error(getErrorMessage(error, "We couldn't sign the other devices out. Please try again.")),
    });
  };

  return (
    <>
      <SettingsGroup heading="Sign-in">
        <LinkRow label="Change password" description={policySummary(policy.data)} onClick={() => setPasswordOpen(true)} />
      </SettingsGroup>
      <SettingsGroup heading="Sessions">
        {sessions.isLoading ? (
          <div>
            <PanelSkeleton label="Loading your signed-in devices" rows={2} />
          </div>
        ) : sessions.error ? (
          <div>
            <PanelError error={sessions.error} fallback="We could not load your signed-in devices." onRetry={() => sessions.refetch()} />
          </div>
        ) : list.length === 0 ? (
          <ValueRow label="No signed-in devices" description="Devices appear here after you sign in on them." value={null} />
        ) : (
          list.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              showBadge={session.current}
              busy={revokingId === session.id}
              onSignOut={() => signOut(session.id)}
            />
          ))
        )}
        {hasCurrent && others.length > 0 ? (
          <LinkRow label="Sign out of other devices" description="Ends every other session immediately" onClick={() => setConfirmOthers(true)} />
        ) : null}
      </SettingsGroup>

      <ChangePasswordSheet open={passwordOpen} onOpenChange={setPasswordOpen} policy={policy.data} onChanged={invalidateSessions} />
      <ConfirmSheet
        open={confirmOthers}
        onCancel={() => setConfirmOthers(false)}
        onConfirm={signOutOthers}
        eyebrowText="Security"
        title="Sign out of other devices?"
        body={`${others.length === 1 ? "The other device" : `The other ${others.length} devices`} signed in to your account will be signed out now. This device stays signed in.`}
        confirmLabel="Sign out"
        busyLabel="Signing out…"
        busy={revokeOthers.isPending}
        danger
      />
    </>
  );
}
