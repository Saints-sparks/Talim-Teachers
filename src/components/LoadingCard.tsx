// components/shared/LoadingCard.tsx
"use client";
import React from "react";

interface LoadingCardProps {
  /**
   * Additional classes to customize width, margin, etc.
   */
  className?: string;
  /**
   * Tailwind height utility, e.g. "h-40" or "h-48"
   */
  height?: string;
  /**
   * Tailwind border-radius utility, e.g. "rounded", "rounded-lg"
   */
  rounded?: string;
}

/**
 * A simple skeleton card for loading states.
 */
const LoadingCard: React.FC<LoadingCardProps> = ({
  className = "",
  height = "h-40",
  rounded = "rounded-2xl",
}) => {
  return (
    <div
      className={`bg-[#ECECEC] animate-pulse w-full ${height} ${rounded} ${className}`.trim()}
    />
  );
};

export default LoadingCard;
