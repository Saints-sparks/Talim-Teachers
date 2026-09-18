"use client";

import React from "react";
import { AlertCircle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import { ApiError, getErrorMessage } from "@/lib/apiError";

/** Props for {@link LoadingState}. */
export interface LoadingStateProps {
  /** Shown under the spinner. */
  message?: string;
  /** Fill the parent instead of sitting in normal flow. */
  fullHeight?: boolean;
}

/**
 * The one loading state. Use it wherever a page or panel is waiting on data,
 * so every screen waits the same way.
 *
 * @param props - See {@link LoadingStateProps}.
 * @param props.message - Shown under the spinner.
 * @param props.fullHeight - Fill the parent instead of sitting in normal flow.
 * @returns The loading element.
 */
export function LoadingState({ message = "Loading…", fullHeight = false }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-16 ${fullHeight ? "min-h-[50vh] flex-1" : ""}`}
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#003366] border-t-transparent dark:border-blue-400 dark:border-t-transparent" />
      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{message}</p>
    </div>
  );
}

/** Props for {@link ErrorState}. */
export interface ErrorStateProps {
  /** Short heading, e.g. "Couldn't load your classes". */
  title?: string;
  /** What went wrong, in the user's terms. */
  message: string;
  /** Shown as a retry button when given. */
  onRetry?: () => void;
  /** Label for the retry button. */
  retryText?: string;
  /** Draw the offline icon instead of the error icon. */
  offline?: boolean;
}

/**
 * The one error state. Never leave a failed request as a spinner: render this
 * with a message keyed on `error.code` (see {@link ApiErrorState}).
 *
 * @param props - See {@link ErrorStateProps}.
 * @param props.title - Short heading.
 * @param props.message - What went wrong.
 * @param props.onRetry - Retry handler; the button is hidden without one.
 * @param props.retryText - Label for the retry button.
 * @param props.offline - Draw the offline icon.
 * @returns The error element.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryText = "Try again",
  offline = false,
}: ErrorStateProps) {
  const Icon = offline ? WifiOff : AlertCircle;
  return (
    <div role="alert" className="flex flex-1 items-center justify-center py-12">
      <div className="mx-4 max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
          <Icon className="h-6 w-6 text-red-600 dark:text-red-400" strokeWidth={1.75} />
        </div>
        <p className="mb-2 text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</p>
        <p className="mb-6 text-sm text-gray-600 dark:text-slate-300">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003366] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002347]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            {retryText}
          </button>
        )}
      </div>
    </div>
  );
}

/** Props for {@link ApiErrorState}. */
export interface ApiErrorStateProps {
  /** Whatever the query or service threw. */
  error: unknown;
  /** Shown when the error carries no message of its own. */
  fallback?: string;
  /** Retry handler; omitted for errors retrying cannot fix. */
  onRetry?: () => void;
}

/**
 * An {@link ErrorState} keyed on a thrown `ApiError`: it picks the heading from
 * `error.code` and only offers a retry for failures a retry could fix.
 *
 * @param props - See {@link ApiErrorStateProps}.
 * @param props.error - Whatever was thrown.
 * @param props.fallback - Message of last resort.
 * @param props.onRetry - Retry handler.
 * @returns The error element.
 */
export function ApiErrorState({ error, fallback, onRetry }: ApiErrorStateProps) {
  const apiError = error instanceof ApiError ? error : null;
  const title =
    apiError?.code === "NETWORK_OFFLINE"
      ? "You're offline"
      : apiError?.code === "FORBIDDEN"
        ? "You don't have access to this"
        : apiError?.code === "NOT_FOUND"
          ? "We couldn't find that"
          : apiError?.isTransient
            ? "We couldn't reach the server"
            : "Something went wrong";

  return (
    <ErrorState
      title={title}
      message={getErrorMessage(error, fallback)}
      offline={apiError?.code === "NETWORK_OFFLINE"}
      onRetry={apiError && !apiError.isTransient && apiError.status >= 400 && apiError.status < 500 ? undefined : onRetry}
    />
  );
}

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  /** Heading, e.g. "No resources yet". */
  title: string;
  /** One line explaining what would fill this screen. */
  message: string;
  /** Custom illustration or icon; a tray icon is used otherwise. */
  icon?: React.ReactNode;
  /** Label for the call to action. */
  actionText?: string;
  /** Called when the action is pressed; the button is hidden without it. */
  onAction?: () => void;
}

/**
 * The one empty state — a list that legitimately has nothing in it, which is
 * never the same thing as an error.
 *
 * @param props - See {@link EmptyStateProps}.
 * @param props.title - Heading.
 * @param props.message - One line of explanation.
 * @param props.icon - Custom illustration.
 * @param props.actionText - Label for the call to action.
 * @param props.onAction - Called when the action is pressed.
 * @returns The empty-state element.
 */
export function EmptyState({ title, message, icon, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <div className="mx-4 max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800">
          {icon ?? <Inbox className="h-6 w-6 text-gray-400 dark:text-slate-400" strokeWidth={1.75} />}
        </div>
        <p className="mb-2 text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</p>
        <p className="mb-6 text-sm text-gray-600 dark:text-slate-300">{message}</p>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-lg bg-[#003366] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002347]"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}

/** Props for {@link TableSkeleton}. */
export interface TableSkeletonProps {
  /** How many placeholder rows to draw. */
  rows?: number;
  /** How many placeholder columns to draw. */
  columns?: number;
}

/**
 * A placeholder for a table that is still loading, so the page does not jump
 * when the rows arrive.
 *
 * @param props - See {@link TableSkeletonProps}.
 * @param props.rows - Placeholder row count.
 * @param props.columns - Placeholder column count.
 * @returns The skeleton element.
 */
export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="w-full animate-pulse space-y-3 py-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-4 flex-1 rounded bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
      ))}
    </div>
  );
}
