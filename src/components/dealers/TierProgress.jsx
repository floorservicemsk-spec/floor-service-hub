
import React from "react";

const TIERS = [
  { key: 'tier1', name: 'Базовый', min: 0, max: 500000 },
  { key: 'tier2', name: 'Серебряный', min: 500000, max: 1000000 },
  { key: 'tier3', name: 'Золотой', min: 1000000, max: 3000000 },
  { key: 'tier4', name: 'Платиновый', min: 3000000, max: Infinity }
];

function nextTier(current) {
  const idx = TIERS.findIndex(t => t.key === current);
  if (idx < 0 || idx === TIERS.length - 1) return null;
  return TIERS[idx + 1];
}

export default function TierProgress({ currentTier = "tier1", currentPoints = 0, currentMonthTurnover = 0 }) {
  // Новая базовая метрика прогресса — баллы; для обратной совместимости fallback к обороту
  const amount = typeof currentPoints === "number" ? currentPoints : (currentMonthTurnover || 0);

  const cur = TIERS.find(t => t.key === currentTier) || TIERS[0];
  const nxt = nextTier(currentTier);

  // Платиновый — 100% и отдельный текст
  if (!nxt) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Прогресс</span>
          <span className="font-semibold">100%</span>
        </div>
        <div className="relative h-3.5 w-full rounded-full bg-white/50 border border-white/60 overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#0A84FF] via-[#3b82f6] to-[#7c3aed] shadow-[0_0_18px_rgba(59,130,246,0.5)]" />
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(200px_60px_at_20%_50%,rgba(255,255,255,0.35),transparent)]" />
        </div>
        <div className="text-sm text-slate-700">
          Ваши баллы {amount.toLocaleString("ru-RU")} — вы на максимальном уровне <b>{cur.name}</b>.
        </div>
      </div>
    );
  }

  const min = cur.min;
  const goal = nxt.min;
  const base = Math.max(0, amount - min);
  const range = Math.max(1, (goal - min));
  const pct = Math.min(100, Math.max(0, Math.round((base / range) * 100)));
  const remain = Math.max(0, goal - amount);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Прогресс к {nxt.name}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="relative h-3.5 w-full rounded-full bg-white/50 border border-white/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] via-[#3b82f6] to-[#7c3aed] shadow-[0_0_18px_rgba(59,130,246,0.5)] transition-all"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(200px_60px_at_20%_50%,rgba(255,255,255,0.35),transparent)]" />
      </div>
      <div className="text-sm text-slate-700">
        Ваши баллы {amount.toLocaleString("ru-RU")} → осталось{" "}
        <b>{remain.toLocaleString("ru-RU")}</b> до <span className="font-semibold text-indigo-600">{nxt.name}</span>
      </div>
    </div>
  );
}
