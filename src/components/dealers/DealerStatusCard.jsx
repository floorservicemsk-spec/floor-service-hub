import React from "react";
import { useUser } from "@/components/context/UserContext";
import TierBadge from "./TierBadge";
import TierProgress from "./TierProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Trophy, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DealerStatusCard() {
  const { user: me, dealerProfile: profile, bonusEnabled, effectiveTier, refreshUser } = useUser();

  // Если бонусная программа выключена — ничего не показываем
  if (!me || me.user_type !== 'dealer' || bonusEnabled === false) return null;

  const now = new Date();
  const manualEnabled = profile?.manual_tier_enabled && profile?.manual_tier;
  const manualValid = profile?.manual_tier_expires_at ? (new Date(profile.manual_tier_expires_at) > now) : true;
  const currentTier = effectiveTier || "tier1";

  const points = profile?.points_balance || 0;
  const orders = profile?.orders_count_month || 0;
  const manualNote = manualEnabled && manualValid ? "Ваш статус назначен администратором" : null;

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Статус дилера Floor Service Plus</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refreshUser} className="h-8 w-8">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </Button>
            <TierBadge tier={currentTier} animated={currentTier === 'tier4'} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Прогресс теперь по баллам */}
        <TierProgress currentTier={currentTier} currentPoints={points} />
        {manualNote && <div className="text-xs text-amber-600">{manualNote}</div>}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/70 border border-white/50 p-4">
            <div className="text-xs text-slate-500">Баллы</div>
            <div className="text-2xl font-semibold text-indigo-700">{points.toLocaleString('ru-RU')}</div>
          </div>

          <div className="rounded-xl bg-white/70 border border-white/50 p-4">
            <div className="text-xs text-slate-500">Заказы (месяц)</div>
            <div className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              {orders}
            </div>
          </div>

          <div className="rounded-xl bg-white/70 border border-white/50 p-4">
            <div className="text-xs text-slate-500">Рейтинг</div>
            <Button asChild size="sm" className="mt-2 w-full bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white">
              <Link to={createPageUrl("Leaderboard")}><Trophy className="w-4 h-4 mr-2" /> Рейтинг дилеров</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}