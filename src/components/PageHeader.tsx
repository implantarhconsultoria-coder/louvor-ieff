"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export function PageHeader({
  title,
  subtitle,
  backHref = "/",
  right,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-white/5 px-4 pt-4 pb-3">
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-300" />
          </motion.div>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
