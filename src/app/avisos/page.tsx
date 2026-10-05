"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { formatDateBR } from "@/lib/utils";

export default function AvisosPage() {
  const notices = useAppStore((s) => s.notices);

  return (
    <div>
      <PageHeader title="Avisos" subtitle={`${notices.length} comunicados`} />
      <div className="px-4 py-4 space-y-3">
        {notices.map((n, idx) => (
          <motion.article
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative overflow-hidden rounded-2xl border border-white/8 bg-card p-4"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-pink-500" />
            <div className="flex items-start gap-3 pl-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white">{n.title}</h3>
                  <time className="shrink-0 text-[10px] text-zinc-600">
                    {formatDateBR(n.date)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {n.message}
                </p>
                <p className="mt-3 text-[11px] text-zinc-600">
                  Responsável:{" "}
                  <span className="text-zinc-400">{n.responsible}</span>
                </p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
