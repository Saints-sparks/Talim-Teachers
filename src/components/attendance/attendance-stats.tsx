interface StatsChangeProps {
  type: "increase" | "decrease";
  value: number;
  text: string;
}

interface AttendanceStatsProps {
  title: string;
  value: number | string;
  change: StatsChangeProps;
}

export function AttendanceStats({
  title,
  value,
  change,
}: AttendanceStatsProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground">
      <div className="p-6">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          <div
            className={`text-sm ${
              change.type === "increase" ? "text-green-600" : "text-red-600"
            }`}
          >
            {change.text}
          </div>
        </div>
      </div>
    </div>
  );
}
