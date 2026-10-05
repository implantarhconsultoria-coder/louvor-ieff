import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  PENDENTE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  TESTANDO: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  APROVADO: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  DISPONIVEL: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        styles[status] ?? styles.PENDENTE,
        className
      )}
    >
      {status}
    </span>
  );
}
