
import React from "react";
import { Circle, Shield, Crown, Gem } from "lucide-react";

const tierMap = {
  tier1: {
    label: "Базовый",
    bg: "bg-gradient-to-r from-slate-100 to-slate-200",
    ring: "ring-1 ring-slate-300/60",
    text: "text-slate-700",
    icon: Circle,
    iconBg: "bg-gradient-to-br from-slate-200 to-slate-300 ring-1 ring-white/40 shadow-sm",
    iconText: "text-slate-700"
  },
  tier2: {
    label: "Серебряный",
    bg: "bg-gradient-to-r from-zinc-200 to-slate-100",
    ring: "ring-1 ring-zinc-300/70 shadow-[0_0_20px_rgba(148,163,184,0.25)]",
    text: "text-zinc-700",
    icon: Shield,
    iconBg: "bg-gradient-to-br from-zinc-200 via-slate-100 to-white ring-1 ring-white/50 shadow",
    iconText: "text-zinc-700"
  },
  tier3: {
    label: "Золотой",
    bg: "bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300",
    ring: "ring-1 ring-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.35)]",
    text: "text-amber-900",
    icon: Crown,
    iconBg: "bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-300 ring-1 ring-white/50 shadow-[0_4px_18px_rgba(245,158,11,0.45)]",
    iconText: "text-amber-900"
  },
  tier4: {
    label: "Платиновый",
    bg: "bg-gradient-to-r from-slate-50 via-zinc-100 to-slate-50",
    ring: "ring-2 ring-indigo-300/60 shadow-[0_0_32px_rgba(99,102,241,0.45)]",
    text: "text-slate-800",
    icon: Gem,
    iconBg: "bg-gradient-to-br from-indigo-200 via-blue-200 to-slate-100 ring-1 ring-white/60 shadow-[0_6px_20px_rgba(99,102,241,0.35)]",
    iconText: "text-indigo-700"
  }
};

export default function TierBadge({ tier = "tier1", animated = false }) {
  const t = tierMap[tier] || tierMap.tier1;
  const Icon = t.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl ${t.bg} ${t.ring} ${t.text} relative overflow-hidden`}
    >
      {tier === "tier4" && (
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120px_60px_at_0%_0%,rgba(99,102,241,0.25),transparent),radial-gradient(120px_60px_at_100%_100%,rgba(14,165,233,0.2),transparent)]" />
      )}

      {/* Премиум иконка с градиентной «капсулой» */}
      <div className={`relative w-6 h-6 rounded-lg flex items-center justify-center ${t.iconBg}`}>
        <Icon className={`w-3.5 h-3.5 ${t.iconText} ${tier === "tier4" && animated ? "animate-pulse" : ""}`} />
        {/* Блик для золота и платины */}
        {(tier === "tier3" || tier === "tier4") && (
          <span className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(120deg,rgba(255,255,255,0.6),rgba(255,255,255,0))] opacity-60" />
        )}
      </div>

      <span className="text-sm font-semibold">{t.label}</span>
    </div>
  );
}
