"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, Trophy } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useUser } from "@/components/context/UserContext";

interface DealerRanking {
  userId: string;
  name: string;
  tier: string;
  points: number;
}

function TierBadge({
  tier,
  animated = false,
}: {
  tier: string;
  animated?: boolean;
}) {
  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "tier4":
        return {
          name: "Платиновый",
          color: "bg-gradient-to-r from-indigo-500 to-purple-500",
        };
      case "tier3":
        return {
          name: "Золотой",
          color: "bg-gradient-to-r from-amber-400 to-yellow-500",
        };
      case "tier2":
        return {
          name: "Серебряный",
          color: "bg-gradient-to-r from-gray-400 to-slate-500",
        };
      default:
        return {
          name: "Бронзовый",
          color: "bg-gradient-to-r from-orange-400 to-amber-600",
        };
    }
  };

  const tierInfo = getTierInfo(tier);

  return (
    <Badge
      className={`${tierInfo.color} text-white ${animated ? "animate-pulse" : ""}`}
    >
      {tierInfo.name}
    </Badge>
  );
}

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<DealerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDealerLeaderboard();
      setRankings(data);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const top10 = rankings.slice(0, 10);
  const myIndex = user?.id ? rankings.findIndex((r) => r.userId === user.id) : -1;
  const total = rankings.length;

  const frameByTier = (tier: string) => {
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

  const myTier = myIndex >= 0 ? rankings[myIndex]?.tier || "tier1" : "tier1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Рейтинг дилеров</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/account/profile">
              <ArrowLeft className="w-4 h-4 mr-2" /> Назад в личный кабинет
            </Link>
          </Button>
        </div>

        {myIndex >= 0 && (
          <div
            className={`rounded-2xl px-5 py-4 border border-white/20 ${frameByTier(myTier)} mb-6 flex items-center justify-between`}
          >
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
                      const isMe = user?.id === r.userId;
                      return (
                        <tr
                          key={r.userId}
                          className={`border-t ${isMe ? "bg-blue-50/60" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {idx < 3 && (
                                <Award
                                  className={`w-4 h-4 ${
                                    idx === 0
                                      ? "text-amber-500"
                                      : idx === 1
                                        ? "text-gray-400"
                                        : "text-orange-600"
                                  }`}
                                />
                              )}
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-medium ${isMe ? "text-indigo-700" : "text-slate-900"}`}
                            >
                              {r.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <TierBadge
                              tier={r.tier}
                              animated={r.tier === "tier4"}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {top10.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          Нет данных для рейтинга
                        </td>
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
