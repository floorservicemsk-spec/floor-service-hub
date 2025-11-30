import React, { useEffect, useState } from "react";
import { HomeBanner } from "@/entities/HomeBanner";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Image, Plus, Save, RefreshCw, Trash2, Upload } from "lucide-react";

export default function BannerManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const empty = {
    title: "",
    subtitle: "",
    mediaType: "none",
    mediaUrl: "",
    overlayGradient: "",
    ctaPrimary: { label: "", href: "", isExternal: false },
    ctaSecondary: { label: "", href: "", isExternal: false },
    isActive: true,
    startAt: "",
    endAt: "",
    priority: 0
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const list = await HomeBanner.list("-updated_date", 50);
    setItems(list);
    setLoading(false);
  };

  const startNew = () => setEditing({ ...empty });
  const editItem = (it) => setEditing(JSON.parse(JSON.stringify(it)));

  const save = async () => {
    if (!editing.title?.trim()) {
      alert("Заголовок обязателен");
      return;
    }
    if (editing.id) {
      await HomeBanner.update(editing.id, editing);
    } else {
      await HomeBanner.create(editing);
    }
    setEditing(null);
    await load();
  };

  const remove = async (id) => {
    if (confirm("Удалить баннер?")) {
      await HomeBanner.delete(id);
      if (editing?.id === id) setEditing(null);
      await load();
    }
  };

  const onUploadMedia = async (file) => {
    if (!file) return;
    const { file_url } = await UploadFile({ file });
    setEditing(prev => ({ ...prev, mediaUrl: file_url }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Баннер главной страницы</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Button onClick={startNew}>
            <Plus className="w-4 h-4 mr-2" />
            Создать
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* List */}
        <Card className="bg-white/70 border-white/20">
          <CardHeader>
            <CardTitle>Список баннеров</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-slate-500">Баннеры отсутствуют</div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.title}</div>
                      <div className="text-xs text-slate-500">Активен: {it.isActive ? "Да" : "Нет"} • Приоритет: {it.priority ?? 0}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editItem(it)}>Редактировать</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(it.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="bg-white/70 border-white/20">
          <CardHeader>
            <CardTitle>{editing?.id ? "Редактирование" : "Создание"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editing ? (
              <div className="text-slate-500">Выберите баннер или нажмите «Создать»</div>
            ) : (
              <>
                <div className="grid gap-3">
                  <Input placeholder="Заголовок" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                  <Textarea placeholder="Подзаголовок" value={editing.subtitle || ""} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600">Тип медиа</label>
                    <Select value={editing.mediaType || "none"} onValueChange={(v) => setEditing({ ...editing, mediaType: v })}>
                      <SelectTrigger><SelectValue placeholder="Тип медиа" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Нет</SelectItem>
                        <SelectItem value="image">Изображение</SelectItem>
                        <SelectItem value="video">Видео</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Медиа URL</label>
                    <div className="flex gap-2">
                      <Input value={editing.mediaUrl || ""} onChange={e => setEditing({ ...editing, mediaUrl: e.target.value })} placeholder="https://..." />
                      <label className="inline-flex">
                        <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => onUploadMedia(e.target.files?.[0])} />
                        <span className="inline-flex items-center px-3 rounded-md border bg-white cursor-pointer">
                          <Upload className="w-4 h-4" />
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600">Градиент оверлея (CSS)</label>
                  <Input placeholder="linear-gradient(...)" value={editing.overlayGradient || ""} onChange={e => setEditing({ ...editing, overlayGradient: e.target.value })} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Primary CTA</div>
                    <Input placeholder="Текст кнопки" value={editing.ctaPrimary?.label || ""} onChange={e => setEditing({ ...editing, ctaPrimary: { ...(editing.ctaPrimary || {}), label: e.target.value } })} />
                    <Input placeholder="Ссылка (/Chat или https://...)" value={editing.ctaPrimary?.href || ""} onChange={e => setEditing({ ...editing, ctaPrimary: { ...(editing.ctaPrimary || {}), href: e.target.value } })} />
                    <div className="flex items-center gap-2">
                      <Switch checked={!!editing.ctaPrimary?.isExternal} onCheckedChange={(v) => setEditing({ ...editing, ctaPrimary: { ...(editing.ctaPrimary || {}), isExternal: v } })} />
                      <span className="text-sm text-slate-600">Открывать в новой вкладке</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Secondary CTA</div>
                    <Input placeholder="Текст кнопки" value={editing.ctaSecondary?.label || ""} onChange={e => setEditing({ ...editing, ctaSecondary: { ...(editing.ctaSecondary || {}), label: e.target.value } })} />
                    <Input placeholder="Ссылка (/KnowledgeBase или https://...)" value={editing.ctaSecondary?.href || ""} onChange={e => setEditing({ ...editing, ctaSecondary: { ...(editing.ctaSecondary || {}), href: e.target.value } })} />
                    <div className="flex items-center gap-2">
                      <Switch checked={!!editing.ctaSecondary?.isExternal} onCheckedChange={(v) => setEditing({ ...editing, ctaSecondary: { ...(editing.ctaSecondary || {}), isExternal: v } })} />
                      <span className="text-sm text-slate-600">Открывать в новой вкладке</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-slate-600">Активен</label>
                    <div className="mt-1.5">
                      <Switch checked={!!editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Старт</label>
                    <Input type="datetime-local" value={editing.startAt ? editing.startAt.slice(0,16) : ""} onChange={e => setEditing({ ...editing, startAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Окончание</label>
                    <Input type="datetime-local" value={editing.endAt ? editing.endAt.slice(0,16) : ""} onChange={e => setEditing({ ...editing, endAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600">Приоритет</label>
                  <Input type="number" value={editing.priority ?? 0} onChange={e => setEditing({ ...editing, priority: Number(e.target.value || 0) })} />
                </div>

                <div className="flex gap-2">
                  <Button onClick={save}><Save className="w-4 h-4 mr-2" />Сохранить</Button>
                  <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}