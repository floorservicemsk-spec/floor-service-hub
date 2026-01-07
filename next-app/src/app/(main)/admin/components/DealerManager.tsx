"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Pencil, Sparkles, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface DealerProfile {
  id: string;
  companyName?: string;
  region?: string;
  currentTier: string;
  autoTier: string;
  manualTier?: string;
  manualTierEnabled: boolean;
  manualTierExpiresAt?: string;
  pointsBalance: number;
  monthlyTurnover: number;
  lastMonthTurnover: number;
}

interface DealerUser {
  id: string;
  email: string;
  displayName?: string;
  fullName?: string;
  city?: string;
  retailPoint?: string;
  profile: DealerProfile | null;
}

const TIER_OPTIONS = [
  { key: "TIER1", label: "Базовый" },
  { key: "TIER2", label: "Серебряный" },
  { key: "TIER3", label: "Золотой" },
  { key: "TIER4", label: "Платиновый" },
];

export default function DealerManager() {
  const [dealers, setDealers] = useState<DealerUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    user: DealerUser;
    profile: DealerProfile;
  } | null>(null);
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [bonusSettings, setBonusSettings] = useState<{
    id?: string;
    enabled: boolean;
  } | null>(null);
  const [bonusLoading, setBonusLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setBonusLoading(true);
    try {
      const response = await fetch("/api/admin/dealers");
      if (response.ok) {
        const data = await response.json();
        setDealers(data.dealers);
        setBonusSettings(data.bonusSettings);
      }
    } catch (error) {
      console.error("Error loading dealers:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить дилеров",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setBonusLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDealers = useMemo(() => {
    if (!search.trim()) return dealers;

    const q = search.toLowerCase();
    return dealers.filter(
      (d) =>
        (d.displayName || d.fullName || "").toLowerCase().includes(q) ||
        (d.profile?.companyName || "").toLowerCase().includes(q) ||
        (d.email || "").toLowerCase().includes(q)
    );
  }, [dealers, search]);

  const openEdit = (dealer: DealerUser) => {
    setEditing({
      user: dealer,
      profile: dealer.profile || {
        id: "",
        companyName:
          dealer.retailPoint || dealer.fullName || dealer.email,
        region: dealer.city || "",
        pointsBalance: 0,
        autoTier: "TIER1",
        currentTier: "TIER1",
        manualTierEnabled: false,
        monthlyTurnover: 0,
        lastMonthTurnover: 0,
      },
    });
  };

  const saveEdit = async () => {
    if (!editing) return;

    const { user, profile } = editing;
    const toSave = { ...profile };

    if (toSave.manualTierEnabled) {
      toSave.currentTier = toSave.manualTier || toSave.currentTier;
    } else {
      toSave.manualTier = undefined;
    }

    try {
      await fetch("/api/admin/dealers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          profileId: profile.id || undefined,
          ...toSave,
        }),
      });

      toast({ title: "Успех", description: "Дилер обновлён" });
      setEditing(null);
      loadData();
    } catch (error) {
      console.error("Error saving dealer:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const recalc = async () => {
    if (recalcRunning) return;
    setRecalcRunning(true);

    try {
      const result = await api.computeDealerTiers();
      if (result.success) {
        toast({
          title: "Успех",
          description: `Пересчитано профилей: ${result.updated || 0}`,
        });
      } else if (result.error) {
        toast({
          title: "Ошибка",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error recalculating tiers:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось пересчитать статусы",
        variant: "destructive",
      });
    } finally {
      await loadData();
      setRecalcRunning(false);
    }
  };

  const toggleBonus = async (checked: boolean) => {
    setBonusSettings((prev) => ({ ...(prev || {}), enabled: checked }));

    try {
      await fetch("/api/admin/dealers/bonus-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });

      toast({
        title: "Успех",
        description: checked
          ? "Бонусная программа включена"
          : "Бонусная программа выключена",
      });
    } catch (error) {
      console.error("Error toggling bonus:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить настройку",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Bonus Program Toggle */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Бонусная программа
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-slate-900">
              Включить бонусную программу
            </div>
            <div className="text-sm text-slate-600">
              Если выключено — пользователи не видят статус дилера и баллы в
              личном кабинете и на главной.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm ${
                bonusSettings?.enabled ? "text-green-600" : "text-slate-500"
              }`}
            >
              {bonusSettings?.enabled ? "Включено" : "Выключено"}
            </span>
            <Switch
              checked={!!bonusSettings?.enabled}
              onCheckedChange={toggleBonus}
              disabled={bonusLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dealers List */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Управление дилерами ({dealers.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Обновить
            </Button>
            <Button
              onClick={recalc}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={recalcRunning}
            >
              <Sparkles
                className={`w-4 h-4 mr-2 ${recalcRunning ? "animate-spin" : ""}`}
              />
              {recalcRunning ? "Пересчитываем…" : "Пересчитать статусы"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input
              placeholder="Поиск по имени, компании или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rounded-lg border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead>Оборот (мес.)</TableHead>
                  <TableHead>Баллы</TableHead>
                  <TableHead>Тир (авто)</TableHead>
                  <TableHead>Тир (текущий)</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredDealers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-slate-500 py-8"
                    >
                      {search ? "Ничего не найдено" : "Нет дилеров"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <div className="font-medium">
                          {dealer.displayName ||
                            dealer.fullName ||
                            dealer.email}
                        </div>
                        <div className="text-xs text-slate-500">
                          {dealer.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {dealer.profile?.companyName || "—"}
                      </TableCell>
                      <TableCell>
                        {(dealer.profile?.monthlyTurnover || 0).toLocaleString(
                          "ru-RU"
                        )}{" "}
                        ₽
                      </TableCell>
                      <TableCell>
                        {(dealer.profile?.pointsBalance || 0).toLocaleString(
                          "ru-RU"
                        )}
                      </TableCell>
                      <TableCell>
                        {TIER_OPTIONS.find(
                          (t) => t.key === dealer.profile?.autoTier
                        )?.label || "—"}
                      </TableCell>
                      <TableCell>
                        {TIER_OPTIONS.find(
                          (t) => t.key === dealer.profile?.currentTier
                        )?.label || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(dealer)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editing && (
        <Dialog open={true} onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Редактирование дилера</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Компания</Label>
                <Input
                  value={editing.profile.companyName || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      profile: {
                        ...editing.profile,
                        companyName: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Регион</Label>
                  <Input
                    value={editing.profile.region || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        profile: { ...editing.profile, region: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Баллы</Label>
                  <Input
                    type="number"
                    value={editing.profile.pointsBalance || 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        profile: {
                          ...editing.profile,
                          pointsBalance: parseFloat(e.target.value || "0"),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ручной тир</Label>
                  <Select
                    value={editing.profile.manualTier || ""}
                    onValueChange={(v) =>
                      setEditing({
                        ...editing,
                        profile: { ...editing.profile, manualTier: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Не указан" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIER_OPTIONS.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    id="manualTierEnabled"
                    checked={!!editing.profile.manualTierEnabled}
                    onCheckedChange={(v) =>
                      setEditing({
                        ...editing,
                        profile: {
                          ...editing.profile,
                          manualTierEnabled: !!v,
                        },
                      })
                    }
                  />
                  <Label htmlFor="manualTierEnabled" className="text-sm">
                    Присвоить вручную
                  </Label>
                </div>
              </div>
              <div>
                <Label>Срок действия ручного тира</Label>
                <Input
                  type="date"
                  value={
                    editing.profile.manualTierExpiresAt
                      ? editing.profile.manualTierExpiresAt.slice(0, 10)
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "";
                    setEditing({
                      ...editing,
                      profile: {
                        ...editing.profile,
                        manualTierExpiresAt: val || undefined,
                      },
                    });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Отмена
                </Button>
                <Button onClick={saveEdit}>Сохранить</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
