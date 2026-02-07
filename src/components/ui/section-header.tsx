"use client";

import React from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  meta,
  actions,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="rounded-xl bg-gradient-to-br from-[#E6F0FA] to-white p-3 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#030E18]">
                {title}
              </h1>
              {meta && (
                <span className="text-xs text-[#003366] bg-[#EAF2FB] border border-[#D7E6F6] rounded-full px-2 py-1">
                  {meta}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-[#6F6F6F]">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default SectionHeader;
