"use client";

import React, { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { ContextHeader } from "@/components/grading/workspace/ContextHeader";
import { CourseTeacherGradingTab } from "@/components/grading/workspace/CourseTeacherGradingTab";
import { ClassTeacherGradingTab } from "@/components/grading/workspace/ClassTeacherGradingTab";
import { RoleMode } from "@/components/grading/workspace/types";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import { useAuth } from "@/app/hooks/useAuth";

const GradingPage: React.FC = () => {
  const { getAccessToken } = useAuth();
  const [role, setRole] = useState<RoleMode>("course");
  const [termLabel, setTermLabel] = useState("");
  const [scopeLabel, setScopeLabel] = useState("");
  const [actions, setActions] = useState<{ refresh: () => void; primary: () => void; export: () => void; batch?: () => void }>({
    refresh: () => undefined,
    primary: () => undefined,
    export: () => undefined,
  });

  const primaryLabel = useMemo(() => {
    if (role === "course") return "Continue Grading";
    return "Generate Class Summary";
  }, [role]);

  const scopeDefaults = role === "course"
    ? "Course + Class"
    : "Class";

  return (
    <Layout>
      <div className="min-h-screen bg-[#EBF0F7] p-3 sm:p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <ContextHeader
            role={role}
            termLabel={termLabel}
            scopeLabel={scopeLabel || scopeDefaults}
            onRefresh={actions.refresh}
            onPrimary={actions.primary}
            onExport={actions.export}
            primaryLabel={primaryLabel}
            canBatchUpload={role === "course"}
            onBatchUpload={actions.batch}
          />

          <div className="rounded-xl border border-[#D7E1ED] bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={`rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366] ${role === "course" ? "bg-[#003366] text-white" : "text-slate-600 hover:bg-[#EBF0F7] dark:text-slate-300 dark:hover:bg-slate-700"}`}
                onClick={() => setRole("course")}
              >
                Course Teacher
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366] ${role === "class" ? "bg-[#003366] text-white" : "text-slate-600 hover:bg-[#EBF0F7] dark:text-slate-300 dark:hover:bg-slate-700"}`}
                onClick={() => setRole("class")}
              >
                Class Teacher
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#D7E1ED] bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            {role === "course" ? (
              <CourseTeacherGradingTab
                onScopeChange={({ termLabel: t, scopeLabel: s }) => {
                  setTermLabel(t);
                  setScopeLabel(s);
                }}
                registerActions={setActions}
              />
            ) : (
              <ClassTeacherGradingTab
                onScopeChange={({ termLabel: t, scopeLabel: s }) => {
                  setTermLabel(t);
                  setScopeLabel(s);
                }}
                registerActions={setActions}
              />
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default GradingPage;
