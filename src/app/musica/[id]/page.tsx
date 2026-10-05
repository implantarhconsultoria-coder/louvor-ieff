"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Headphones,
  AlignLeft,
  FileMusic,
  Link2,
  Mic,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppStore } from "@/lib/store";
import { displayTone } from "@/lib/utils";

export default function MusicaPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const getSong = useAppStore((s) => s.getSong);
  const program = useAppStore((s) => s.program);
  const song = getSong(id);
  const programItem = program.items.find((i) => i.songId === id);

  if (!song) {
    return (
      <div>
        <PageHeader title="Música" backHref="/programacao" />
        <p className="p-6 text-center text-zinc-500">Música não encontrada.</p>
      </div>
    );
  }

  const actions = [
    {
      label: "Ouvir",
      icon: Headphones,
      href: song.listenUrl || "#",
      disabled: !song.listenUrl,
      desc: song.listenUrl ? "Abrir áudio" : "Link pendente",
    },
    {
      label: "Letra",
      icon: AlignLeft,
      href: "#",
      disabled: !song.lyrics,
      desc: song.lyrics ? "Ver letra" : "Letra pendente",
    },
    {
      label: "Cifra",
      icon: FileMusic,
      href: `/musica/${id}/cifra`,
      disabled: false,
      desc: song.cifraStatus === "DISPONIVEL" ? "Abrir cifra" : "Cifra pendente",
    },
    {
      label: "Referência",
      icon: Link2,
      href: song.reference || "#",
      disabled: !song.reference,
      desc: song.reference ? "Abrir ref." : "Ref. pendente",
    },
  ];

  return (
    <div>
      <PageHeader title="Música" backHref="/programacao" />
      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-6 glow-purple"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-pink-600/15 to-transparent" />
          <div className="relative">
            <StatusBadge status={song.cifraStatus === "DISPONIVEL" ? "DISPONIVEL" : "PENDENTE"} />
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white">
              {song.name}
            </h1>
            {programItem && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                <Mic className="h-4 w-4 text-neon-pink" />
                <span>
                  Solo: <strong className="text-white">{programItem.solo}</strong>
                </span>
              </div>
            )}
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Tom
              </span>
              <span className="text-lg font-bold text-neon-cyan">
                {displayTone(programItem?.tone ?? song.tone)}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {actions.map((a) => {
            const inner = (
              <motion.div
                whileTap={{ scale: a.disabled ? 1 : 0.97 }}
                className={`rounded-2xl border p-4 ${
                  a.disabled
                    ? "border-white/5 bg-card/50 opacity-50"
                    : "border-white/10 bg-card hover:border-neon-purple/40"
                }`}
              >
                <a.icon
                  className={`mb-3 h-6 w-6 ${
                    a.disabled ? "text-zinc-600" : "text-neon-purple"
                  }`}
                />
                <p className="text-sm font-bold text-white">{a.label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{a.desc}</p>
              </motion.div>
            );
            if (a.disabled || a.href === "#") {
              return <div key={a.label}>{inner}</div>;
            }
            return (
              <Link key={a.label} href={a.href}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
