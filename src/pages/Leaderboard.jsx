
import React, { useEffect, useMemo, useState } from "react";
import { DealerProfile } from "@/entities/DealerProfile";
import { User } from "@/entities/User";
import TierBadge from "@/components/dealers/TierBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LeaderboardPage() {
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [uMe, dealerUsers, allProfiles] = await Promise.all([
          User.me().catch(() => null),
          User.filter({ user_type: "dealer" }, "-created_date", 5000),
          DealerProfile.list("-updated_date", 5000)
        ]);
        setMe(uMe);
        setUsers(dealerUsers);
        setProfiles(allProfiles);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // NEW: уникализируем профили по user_id (берём самый свежий или с большими баллами)
  const uniqueProfiles = useMemo(() => {
    const map = new Map();
    for (const p of profiles) {
      const existing = map.get(p.user_id);
      if (!existing) {
        map.set(p.user_id, p);
      } else {
        const newer =
          new Date(p.updated_date || p.created_date || 0) >
          new Date(existing.updated_date || existing.created_date || 0);
        const morePoints = (p.points_balance || 0) > (existing.points_balance || 0);
        map.set(p.user_id, (newer || morePoints) ? p : existing);
      }
    }
    return Array.from(map.values());
  }, [profiles]);

  const rows = useMemo(() => {
    const uMap = new Map(users.map(u => [u.id, u]));
    const list = uniqueProfiles
      .map(p => {
        const u = uMap.get(p.user_id);
        if (!u) return null;
        // Эффективный тир (учитываем ручной до истечения)
        const now = new Date();
        const manual = p.manual_tier_enabled && p.manual_tier && (!p.manual_tier_expires_at || new Date(p.manual_tier_expires_at) > now);
        const tier = manual ? p.manual_tier : (p.current_tier || "tier1");
        return {
          userId: u.id,
          name: u.full_name || u.email, // ИМЯ из личного кабинета
          tier,
          points: p.points_balance || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.points - a.points)); // рейтинг по баллам
    return list;
  }, [users, uniqueProfiles]);

  const top10 = rows.slice(0, 10);
  const myIndex = me?.id ? rows.findIndex(r => r.userId === me.id) : -1;
  const total = rows.length;

  // NEW: стили рамки по тиру
  const frameByTier = (tier) => {
    switch (tier) {
      case "tier4":
        return "bg-white/80 ring-2 ring-indigo-300/70 shadow-[0_0_32px_rgba(99,102,241,0.35)]";
      case "tier3":
        return "bg-white/80 ring-2 ring-amber-300/70 shadow-[0_0_28px_rgba(245,158,11,0.35)]";
      case "tier2":
        return "bg-white/80 ring ring-zinc-300/70 shadow-[0_0_18px_rgba(148,163,184,0.25)]";
      default:
        return "bg-white/70 ring ring-slate-300/60";
    }
  };

  const myTier = myIndex >= 0 ? (rows[myIndex]?.tier || "tier1") : "tier1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Рейтинг дилеров</h1>
          <Button asChild variant="outline">
            <Link to={createPageUrl("AccountProfile")}><ArrowLeft className="w-4 h-4 mr-2" /> Назад в личный кабинет</Link>
          </Button>
        </div>

        {myIndex >= 0 && (
          <div className={`rounded-2xl px-5 py-4 border border-white/20 ${frameByTier(myTier)} mb-6 flex items-center justify-between`}>
            <div className="text-sm text-slate-700">
              Ваше место: <b>{myIndex + 1}</b> из {total}
            </div>
            <TierBadge tier={myTier} animated={myTier === "tier4"} />
          </div>
        )}

        <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle>Топ‑10 по баллам</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-slate-500">Загрузка…</div>
            ) : (
              <div className="rounded-lg border bg-white overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left px-4 py-3 w-16">#</th>
                      <th className="text-left px-4 py-3">Имя дилера</th>
                      <th className="text-left px-4 py-3">Тир</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10.map((r, idx) => {
                      const isMe = me?.id === r.userId;
                      return (
                        <tr key={r.userId} className={`border-t ${isMe ? "bg-blue-50/60" : ""}`}>
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${isMe ? "text-indigo-700" : "text-slate-900"}`}>{r.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <TierBadge tier={r.tier} animated={r.tier === "tier4"} />
                          </td>
                        </tr>
                      );
                    })}
                    {top10.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">Нет данных для рейтинга</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
