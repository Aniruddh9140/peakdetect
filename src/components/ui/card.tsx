import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white border border-slate-200/80 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("px-6 pt-5 pb-3", className)}>{children}</div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-slate-500 mt-0.5", className)}>{children}</p>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 pb-5", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-6 pb-5 pt-0 flex items-center",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    outline: "bg-white text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  icon?: any;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: "blue" | "emerald" | "amber" | "red" | "purple";
}) {
  const accentColors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card className="p-5 glow-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg", accentColors[accent])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {trendValue && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "font-semibold",
              trend === "up"
                ? "text-red-600"
                : trend === "down"
                ? "text-emerald-600"
                : "text-slate-500"
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </span>
          <span className="text-slate-400">vs last week</span>
        </div>
      )}
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 grid place-items-center mb-4 text-slate-400">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-900 mb-1">{title}</h4>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} />;
}
