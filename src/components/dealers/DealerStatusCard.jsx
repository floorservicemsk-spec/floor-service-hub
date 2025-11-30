
import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import { DealerProfile } from "@/entities/DealerProfile";
import { BonusSettings } from "@/entities/BonusSettings";
import TierBadge from "./TierBadge";
import TierProgress from "./TierProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Trophy, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DealerStatusCard() {
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bonusEnabled, setBonusEnabled] = useState(true);

  const load = async () => {
    try {
      const u = await User.me();
      setMe(u);
      if (u.user_type === 'dealer') {
        const [prof, bonus] = await Promise.all([
          DealerProfile.filter({ user_id: u.id }),
          BonusSettings.list()
        ]);
        setProfile(prof[0] || null);
        setBonusEnabled(bonus[0]?.enabled !== false);
      } else {
        setProfile(null);
      }
    } catch (_) {
      // Handle error, e.g., log it or set a temporary error state
      console.error("Failed to load user or dealer profile or bonus settings:", _);
      setMe(null); // Keep this to ensure UI reflects no user/profile on error
      setProfile(null); // Keep this to ensure UI reflects no user/profile on error
      setBonusEnabled(true); // As per outline, set to true on error
    }
  };

  useEffect(() => {
    load();
    // Обновляем профиль при возврате фокуса в окно (после правок в админке)
    const onFocus = () => load();
    const onUserUpdated = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("user-updated", onUserUpdated);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("user-updated", onUserUpdated);
    };
  }, []);

  // Если бонусная программа выключена — ничего не показываем
  if (!me || me.user_type !== 'dealer' || bonusEnabled === false) return null;

  const now = new Date();
  const manualEnabled = profile?.manual_tier_enabled && profile?.manual_tier;
  const manualValid = profile?.manual_tier_expires_at ? (new Date(profile.manual_tier_expires_at) > now) : true;
  const effectiveTier = manualEnabled && manualValid ? profile.manual_tier : (profile?.current_tier || "tier1");

  const turnover = profile?.monthly_turnover || 0;
  // CHANGED: Баллы берём из админки (DealerProfile.points_balance), не из оборота
  const points = profile?.points_balance || 0;
  const orders = profile?.orders_count_month || 0;
  const manualNote = manualEnabled && manualValid ? "Ваш статус назначен администратором" : null;

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Статус дилера Floor Service Plus</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={load} className="h-8 w-8">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </Button>
            <TierBadge tier={effectiveTier} animated={effectiveTier === 'tier4'} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Прогресс теперь по баллам */}
        <TierProgress currentTier={effectiveTier} currentPoints={points} />
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
