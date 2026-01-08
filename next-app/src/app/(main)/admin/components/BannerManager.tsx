"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, Plus, Save, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  mediaType: string;
  mediaUrl?: string;
  overlayGradient?: string;
  ctaPrimary?: {
    label?: string;
    href?: string;
    isExternal?: boolean;
  };
  ctaSecondary?: {
    label?: string;
    href?: string;
    isExternal?: boolean;
  };
  isActive: boolean;
  startAt?: string;
  endAt?: string;
  priority: number;
}

const emptyBanner: HomeBanner = {
  id: "",
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
  priority: 0,
};

export default function BannerManager() {
  const [items, setItems] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HomeBanner | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/banners");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error loading banners:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить баннеры",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const startNew = () => setEditing({ ...emptyBanner });

  const editItem = (item: HomeBanner) =>
    setEditing(JSON.parse(JSON.stringify(item)));

  const saveBanner = async () => {
    if (!editing?.title?.trim()) {
      toast({
        title: "Ошибка",
        description: "Заголовок обязателен",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editing.id) {
        await fetch("/api/admin/banners", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        });
        toast({ title: "Успех", description: "Баннер обновлён" });
      } else {
        await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        });
        toast({ title: "Успех", description: "Баннер создан" });
      }
      setEditing(null);
      loadBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeBanner = async (id: string) => {
    if (!confirm("Удалить баннер?")) return;

    try {
      await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
      if (editing?.id === id) setEditing(null);
      toast({ title: "Успех", description: "Баннер удалён" });
      loadBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Баннер главной страницы</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBanners} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
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
              <div className="text-slate-500 py-8 text-center">
                Баннеры отсутствуют
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/60 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-slate-500">
                        Активен: {item.isActive ? "Да" : "Нет"} • Приоритет:{" "}
                        {item.priority ?? 0}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editItem(item)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeBanner(item.id)}
                      >
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
            <CardTitle>
              {editing?.id ? "Редактирование" : "Создание"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editing ? (
              <div className="text-slate-500 py-8 text-center">
                Выберите баннер или нажмите «Создать»
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  <div>
                    <Label>Заголовок *</Label>
                    <Input
                      placeholder="Заголовок"
                      value={editing.title}
                      onChange={(e) =>
                        setEditing({ ...editing, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Подзаголовок</Label>
                    <Textarea
                      placeholder="Подзаголовок"
                      value={editing.subtitle || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, subtitle: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Тип медиа</Label>
                    <Select
                      value={editing.mediaType || "none"}
                      onValueChange={(v) =>
                        setEditing({ ...editing, mediaType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Тип медиа" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Нет</SelectItem>
                        <SelectItem value="image">Изображение</SelectItem>
                        <SelectItem value="video">Видео</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Медиа URL</Label>
                    <Input
                      value={editing.mediaUrl || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, mediaUrl: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Градиент оверлея (CSS)</Label>
                  <Input
                    placeholder="linear-gradient(...)"
                    value={editing.overlayGradient || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, overlayGradient: e.target.value })
                    }
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Primary CTA</div>
                    <Input
                      placeholder="Текст кнопки"
                      value={editing.ctaPrimary?.label || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          ctaPrimary: {
                            ...(editing.ctaPrimary || {}),
                            label: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Ссылка (/chat или https://...)"
                      value={editing.ctaPrimary?.href || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          ctaPrimary: {
                            ...(editing.ctaPrimary || {}),
                            href: e.target.value,
                          },
                        })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!editing.ctaPrimary?.isExternal}
                        onCheckedChange={(v) =>
                          setEditing({
                            ...editing,
                            ctaPrimary: {
                              ...(editing.ctaPrimary || {}),
                              isExternal: v,
                            },
                          })
                        }
                      />
                      <span className="text-sm text-slate-600">
                        Открывать в новой вкладке
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Secondary CTA</div>
                    <Input
                      placeholder="Текст кнопки"
                      value={editing.ctaSecondary?.label || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          ctaSecondary: {
                            ...(editing.ctaSecondary || {}),
                            label: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Ссылка (/knowledgebase или https://...)"
                      value={editing.ctaSecondary?.href || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          ctaSecondary: {
                            ...(editing.ctaSecondary || {}),
                            href: e.target.value,
                          },
                        })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!editing.ctaSecondary?.isExternal}
                        onCheckedChange={(v) =>
                          setEditing({
                            ...editing,
                            ctaSecondary: {
                              ...(editing.ctaSecondary || {}),
                              isExternal: v,
                            },
                          })
                        }
                      />
                      <span className="text-sm text-slate-600">
                        Открывать в новой вкладке
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Активен</Label>
                    <div className="mt-1.5">
                      <Switch
                        checked={!!editing.isActive}
                        onCheckedChange={(v) =>
                          setEditing({ ...editing, isActive: v })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Старт</Label>
                    <Input
                      type="datetime-local"
                      value={
                        editing.startAt ? editing.startAt.slice(0, 16) : ""
                      }
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          startAt: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Окончание</Label>
                    <Input
                      type="datetime-local"
                      value={editing.endAt ? editing.endAt.slice(0, 16) : ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          endAt: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Приоритет</Label>
                  <Input
                    type="number"
                    value={editing.priority ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        priority: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveBanner} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    Отмена
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
