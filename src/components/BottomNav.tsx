"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Library, Radio, Bell, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const tabs = [
  { href: "/", label: "Início", icon: Home },
  { href: "/repertorio", label: "Repertório", icon: Library },
  { href: "/culto", label: "Culto", icon: Radio, center: false },
  { href: "/avisos", label: "Avisos", icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();
  const live = useAppStore((s) => s.live);
  const hide =
    pathname?.includes("/cifra") ||
    pathname?.startsWith("/ministro");

  if (hide) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-phone pointer-events-auto">
        <div className="mx-3 mb-3 rounded-2xl border border-white/10 glass glow-purple">
          <div className="relative flex items-end justify-around px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {tabs.slice(0, 2).map((tab) => (
              <NavItem key={tab.href} {...tab} active={isActive(tab.href)} live={false} />
            ))}

            {/* Center Ministro button */}
            <Link
              href="/ministro"
              className="relative -mt-6 flex flex-col items-center gap-0.5"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl gradient-purple-pink shadow-neon",
                  pathname?.startsWith("/ministro") && "ring-2 ring-white/30"
                )}
              >
                <Mic2 className="h-6 w-6 text-white" strokeWidth={2} />
              </motion.div>
              <span className="text-[10px] font-medium tracking-wide text-neon-pink">
                Ministro
              </span>
            </Link>

            {tabs.slice(2).map((tab) => (
              <NavItem
                key={tab.href}
                {...tab}
                active={isActive(tab.href)}
                live={tab.href === "/culto" && live.isLive}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  live,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  live: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 py-1"
    >
      <motion.div whileTap={{ scale: 0.9 }} className="relative">
        <Icon
          className={cn(
            "h-5 w-5 transition-colors",
            active ? "text-neon-purple" : "text-zinc-500"
          )}
          strokeWidth={active ? 2.2 : 1.8}
        />
        {live && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-neon-pink animate-live-pulse" />
        )}
      </motion.div>
      <span
        className={cn(
          "text-[10px] font-medium",
          active ? "text-zinc-200" : "text-zinc-600"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
