"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  FileMusic,
  Library,
  Users,
  Bell,
  Mic2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { CURRENT_USER } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const menuCards = [
  {
    href: "/programacao",
    title: "Programação",
    desc: "Ordem do culto",
    icon: CalendarDays,
    accent: "from-violet-600/40 to-fuchsia-600/20",
    iconColor: "text-violet-300",
    glow: "hover:shadow-neon",
  },
  {
    href: "/repertorio",
    title: "Cifras",
    desc: "Partituras & tons",
    icon: FileMusic,
    accent: "from-pink-600/40 to-violet-600/20",
    iconColor: "text-pink-300",
    glow: "hover:shadow-neon-pink",
  },
  {
    href: "/repertorio",
    title: "Repertório",
    desc: "Todas as músicas",
    icon: Library,
    accent: "from-cyan-600/40 to-violet-600/20",
    iconColor: "text-cyan-300",
    glow: "hover:shadow-neon-cyan",
  },
  {
    href: "/ensaios",
    title: "Ensaios",
    desc: "Tons & aprovações",
    icon: Users,
    accent: "from-fuchsia-600/40 to-cyan-600/20",
    iconColor: "text-fuchsia-300",
    glow: "hover:shadow-neon-pink",
  },
  {
    href: "/avisos",
    title: "Avisos",
    desc: "Comunicados",
    icon: Bell,
    accent: "from-violet-600/30 to-pink-600/20",
    iconColor: "text-violet-200",
    glow: "hover:shadow-neon",
  },
  {
    href: "/ministro",
    title: "Modo Ministro",
    desc: "Comando ao vivo",
    icon: Mic2,
    accent: "from-pink-600/50 to-violet-700/30",
    iconColor: "text-pink-200",
    glow: "hover:shadow-neon-pink",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const program = useAppStore((s) => s.program);
  const live = useAppStore((s) => s.live);

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-neon-purple/80 mb-1">
            Ministério
          </p>
          <h1 className="text-3xl font-black tracking-tight gradient-text">
            LOUVOR IEFF
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Igreja Filhos da Fé</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neon-purple/40 bg-gradient-to-br from-violet-600/40 to-pink-600/30 text-sm font-bold text-white glow-purple">
          {CURRENT_USER.avatarInitials}
        </div>
      </div>

      {/* Hero — Próximo Culto */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/programacao">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 glow-purple">
            <div className="absolute inset-0 gradient-purple-pink opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
            <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-white/80" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
                  Próximo Culto
                </span>
                {live.isLive && (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-pink animate-live-pulse" />
                    AO VIVO
                  </span>
                )}
              </div>
              <p className="text-4xl font-black tracking-tight text-white drop-shadow-lg">
                {program.weekday}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white/90">
                {program.dateLabel}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-white/70">
                  {program.items.length} louvores
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Abrir programação
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Menu cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-2 gap-3"
      >
        {menuCards.map((card) => (
          <motion.div key={card.title} variants={itemAnim}>
            <Link href={card.href}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative h-full overflow-hidden rounded-2xl border border-white/10 bg-card p-4 transition-shadow",
                  card.glow
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-60",
                    card.accent
                  )}
                />
                <div className="relative">
                  <div
                    className={cn(
                      "mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30",
                      card.iconColor
                    )}
                  >
                    <card.icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-sm font-bold text-white">{card.title}</h3>
                  <p className="mt-0.5 text-[11px] text-zinc-400">{card.desc}</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
