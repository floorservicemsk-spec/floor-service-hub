
import React, { useEffect, useMemo, useState } from "react";
import { User } from "@/entities/User";
import { DealerProfile } from "@/entities/DealerProfile";
import { DealerTierChangeLog } from "@/entities/DealerTierChangeLog";
import { BonusSettings } from "@/entities/BonusSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Pencil, Sparkles } from "lucide-react";
import { computeDealerTiers } from "@/functions/computeDealerTiers";

const TIER_OPTIONS = [
  { key: 'tier1', label: 'Базовый' },
  { key: 'tier2', label: 'Серебряный' },
  { key: 'tier3', label: 'Золотой' },
  { key: 'tier4', label: 'Платиновый' }
];

export default function DealerManager() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [bonusSettings, setBonusSettings] = useState(null);
  const [bonusLoading, setBonusLoading] = useState(true);

  const loadBonus = async () => {
    setBonusLoading(true);
    try {
      const list = await BonusSettings.list();
      setBonusSettings(list[0] || null);
    } finally {
      setBonusLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [allUsers, allProfiles] = await Promise.all([
        User.filter({ user_type: 'dealer' }, "-created_date", 2000),
        DealerProfile.list("-updated_date", 5000)
      ]);
      setUsers(allUsers);
      setProfiles(allProfiles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadBonus();
  }, []);

  // Keep auto-refresh when profile is updated anywhere
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('user-updated', handler);
    return () => window.removeEventListener('user-updated', handler);
  }, []);

  const rows = useMemo(() => {
    const map = new Map(profiles.map(p => [p.user_id, p]));
    return users
      .map(u => ({
        user: u,
        profile: map.get(u.id)
      }))
      .filter(row => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (row.user.display_name || row.user.full_name || "").toLowerCase().includes(q) ||
               (row.profile?.company_name || "").toLowerCase().includes(q) ||
               (row.user.email || "").toLowerCase().includes(q);
      });
  }, [users, profiles, search]);

  const openEdit = (row) => setEditing({
    user: row.user,
    profile: row.profile || {
      user_id: row.user.id,
      company_name: row.user.retail_point || row.user.full_name || row.user.email,
      region: row.user.city || null,
      points_balance: 0,
      auto_tier: 'tier1',
      current_tier: 'tier1'
    }
  });

  const saveEdit = async (data) => {
    const { user, profile } = data;
    const toSave = { ...profile };
    // update manual tier flags
    if (toSave.manual_tier_enabled) {
      toSave.current_tier = toSave.manual_tier || toSave.current_tier;
    } else {
      toSave.manual_tier = null;
    }

    if (profile.id) {
      await DealerProfile.update(profile.id, toSave);
    } else {
      await DealerProfile.create(toSave);
    }

    // Log change if manual_tier set
    if (toSave.manual_tier_enabled && toSave.manual_tier) {
      await DealerTierChangeLog.create({
        user_id: user.id,
        changed_by: (await User.me()).email,
        previous_tier: profile.current_tier || 'tier1',
        new_tier: toSave.manual_tier,
        change_type: 'manual',
        reason: 'Назначено администратором',
        expires_at: toSave.manual_tier_expires_at || null
      });
    }

    setEditing(null);
    await load();
  };

  const recalc = async () => {
    if (recalcRunning) return;
    setRecalcRunning(true);

    try {
      const { data } = await computeDealerTiers();
      if (data?.success) {
        alert(`Пересчитано профилей: ${data.updated}`);
      } else if (data?.error) {
        alert(data.error);
      }
    } catch (e) {
      const status = e?.response?.status;
      const retryAfterHeader = e?.response?.headers?.["retry-after"] || e?.response?.headers?.get?.("retry-after");
      const retrySec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
      const errText = e?.response?.data?.error || e?.message || "Ошибка пересчёта";

      if (status === 429) {
        const sec = retrySec || 30;
        alert(`Слишком часто. Повторите через ~${sec} сек.`);
      } else {
        alert(`Ошибка пересчёта: ${errText}`);
      }
    } finally {
      await load();
      setRecalcRunning(false);
    }
  };

  const toggleBonus = async (checked) => {
    // мгновенно обновляем UI
    setBonusSettings(prev => ({ ...(prev || {}), enabled: checked }));
    if (bonusSettings?.id) {
      await BonusSettings.update(bonusSettings.id, { enabled: checked });
    } else {
      const created = await BonusSettings.create({ enabled: checked });
      setBonusSettings(created);
    }
    alert(checked ? "Бонусная программа включена" : "Бонусная программа выключена");
  };

  return (
    <div className="space-y-4">
      {/* Глобальный выключатель бонусной программы */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle>Бонусная программа</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-slate-900">Включить бонусную программу</div>
            <div className="text-sm text-slate-600">Если выключено — пользователи не видят статус дилера и баллы в личном кабинете и на главной.</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${bonusSettings?.enabled ? "text-green-600" : "text-slate-500"}`}>
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

      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Управление дилерами</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button
              onClick={recalc}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={recalcRunning}
            >
              <Sparkles className={`w-4 h-4 mr-2 ${recalcRunning ? 'animate-spin' : ''}`} />
              {recalcRunning ? 'Пересчитываем…' : 'Пересчитать статусы'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input placeholder="Поиск по имени, компании или email..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                {rows.map((row) => (
                  <TableRow key={row.user.id}>
                    <TableCell>
                      <div className="font-medium">{row.user.display_name || row.user.full_name || row.user.email}</div>
                      <div className="text-xs text-slate-500">{row.user.email}</div>
                    </TableCell>
                    <TableCell>{row.profile?.company_name || "—"}</TableCell>
                    <TableCell>{(row.profile?.monthly_turnover || 0).toLocaleString('ru-RU')} ₽</TableCell>
                    <TableCell>{(row.profile?.points_balance || 0).toLocaleString('ru-RU')}</TableCell>
                    <TableCell>{row.profile?.auto_tier || '—'}</TableCell>
                    <TableCell>{row.profile?.current_tier || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500">Нет дилеров</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <Dialog open={true} onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Редактирование дилера</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Компания</Label>
                <Input value={editing.profile.company_name || ""} onChange={(e) => setEditing(prev => ({ ...prev, profile: { ...prev.profile, company_name: e.target.value } }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Регион</Label>
                  <Input value={editing.profile.region || ""} onChange={(e) => setEditing(prev => ({ ...prev, profile: { ...prev.profile, region: e.target.value } }))} />
                </div>
                <div>
                  <Label>Баллы</Label>
                  <Input type="number" value={editing.profile.points_balance || 0} onChange={(e) => setEditing(prev => ({ ...prev, profile: { ...prev.profile, points_balance: parseFloat(e.target.value || "0") } }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ручной тир</Label>
                  <Select value={editing.profile.manual_tier || ''} onValueChange={(v) => setEditing(prev => ({ ...prev, profile: { ...prev.profile, manual_tier: v } }))}>
                    <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                    <SelectContent>
                      {TIER_OPTIONS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    checked={!!editing.profile.manual_tier_enabled}
                    onCheckedChange={(v) => setEditing(prev => ({ ...prev, profile: { ...prev.profile, manual_tier_enabled: !!v } }))}
                  />
                  <Label className="text-sm">Присвоить вручную</Label>
                </div>
              </div>
              <div>
                <Label>Срок действия ручного тира</Label>
                <Input type="date" value={editing.profile.manual_tier_expires_at ? editing.profile.manual_tier_expires_at.slice(0,10) : ""} onChange={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  setEditing(prev => ({ ...prev, profile: { ...prev.profile, manual_tier_expires_at: val } }));
                }} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
                <Button onClick={() => saveEdit(editing)}>Сохранить</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
