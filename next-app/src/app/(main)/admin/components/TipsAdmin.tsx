"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, Save, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdviceArticle {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  type: string;
  status: string;
  isPublic: boolean;
  categoryIds: string[];
  allowedUserTypes: string[];
  html?: string;
  checklist?: unknown;
  coverMediaId?: string;
}

interface AdviceCategory {
  id: string;
  name: string;
  slug?: string;
}

const USER_TYPES = [
  { key: "CLIENT", label: "Клиент" },
  { key: "DEALER", label: "Дилер" },
  { key: "MANAGER", label: "Менеджер" },
];

const slugify = (s: string) =>
  s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-а-яё]/gi, "")
    .replace(/-+/g, "-");

export default function TipsAdmin() {
  const [articles, setArticles] = useState<AdviceArticle[]>([]);
  const [categories, setCategories] = useState<AdviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdviceArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/advice");
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error loading advice:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.summary || "").toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  const blankArticle: Omit<AdviceArticle, "id"> = {
    type: "article",
    title: "",
    slug: "",
    summary: "",
    categoryIds: [],
    html: "<p>Новый материал</p>",
    isPublic: true,
    status: "draft",
    allowedUserTypes: ["CLIENT", "DEALER", "MANAGER"],
  };

  const handleSave = async () => {
    if (!editing?.title) {
      toast({
        title: "Ошибка",
        description: "Заполните заголовок",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...editing,
      slug: editing.slug || slugify(editing.title),
    };

    try {
      if (editing.id) {
        await fetch("/api/admin/advice", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast({ title: "Успех", description: "Материал обновлён" });
      } else {
        const response = await fetch("/api/admin/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        setEditing({ ...editing, id: data.id });
        toast({ title: "Успех", description: "Материал создан" });
      }
      loadData();
    } catch (error) {
      console.error("Error saving article:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить материал?")) return;

    try {
      await fetch(`/api/admin/advice?id=${id}`, { method: "DELETE" });
      toast({ title: "Успех", description: "Материал удалён" });
      setEditing(null);
      loadData();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  const toggleCategory = (catId: string) => {
    if (!editing) return;
    const set = new Set(editing.categoryIds || []);
    if (set.has(catId)) {
      set.delete(catId);
    } else {
      set.add(catId);
    }
    setEditing({ ...editing, categoryIds: Array.from(set) });
  };

  const toggleUserType = (type: string) => {
    if (!editing) return;
    const set = new Set(editing.allowedUserTypes || []);
    if (set.has(type)) {
      set.delete(type);
    } else {
      set.add(type);
    }
    setEditing({ ...editing, allowedUserTypes: Array.from(set) });
  };

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Советы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Материалы</TabsTrigger>
            <TabsTrigger value="edit">Редактор</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Обновить
              </Button>
              <Button
                onClick={() => setEditing(blankArticle as AdviceArticle)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredArticles.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-xs text-slate-500">
                        {a.slug} • {a.status}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(a)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredArticles.length === 0 && (
                <div className="col-span-2 text-center text-slate-500 py-8">
                  {searchQuery ? "Ничего не найдено" : "Материалов пока нет"}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="edit" className="mt-6">
            {!editing ? (
              <div className="text-slate-500 text-center py-8">
                Выберите материал в списке или создайте новый.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Заголовок *</Label>
                    <Input
                      value={editing.title}
                      onChange={(e) =>
                        setEditing({ ...editing, title: e.target.value })
                      }
                      placeholder="Заголовок"
                    />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={editing.slug}
                      onChange={(e) =>
                        setEditing({ ...editing, slug: e.target.value })
                      }
                      placeholder="slug"
                    />
                  </div>
                  <div>
                    <Label>Тип</Label>
                    <Select
                      value={editing.type}
                      onValueChange={(v) => setEditing({ ...editing, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Статья</SelectItem>
                        <SelectItem value="checklist">Чек‑лист</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Статус</Label>
                    <Select
                      value={editing.status}
                      onValueChange={(v) =>
                        setEditing({ ...editing, status: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Черновик</SelectItem>
                        <SelectItem value="published">Опубликовано</SelectItem>
                        <SelectItem value="archived">Архив</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Краткий анонс</Label>
                    <Textarea
                      rows={3}
                      placeholder="Краткий анонс"
                      value={editing.summary || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, summary: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Категории</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {categories.map((c) => {
                        const active = (editing.categoryIds || []).includes(
                          c.id
                        );
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            className={`text-sm px-3 py-1 rounded-full border ${
                              active
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Доступ по типам пользователей</Label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {USER_TYPES.map((r) => {
                        const active = (editing.allowedUserTypes || []).includes(
                          r.key
                        );
                        return (
                          <label
                            key={r.key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${
                              active
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <Checkbox
                              checked={active}
                              onCheckedChange={() => toggleUserType(r.key)}
                            />
                            <span className="text-sm">{r.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Администраторы всегда имеют доступ, независимо от выбора.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>HTML‑контент</Label>
                    <Textarea
                      rows={10}
                      value={editing.html || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, html: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Checkbox
                      checked={!!editing.isPublic}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, isPublic: !!v })
                      }
                    />
                    <span className="text-sm">Публичный материал</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить
                  </Button>
                  {editing.id && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(editing.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <TipsCategories
              categories={categories}
              onUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TipsCategories({
  categories,
  onUpdate,
}: {
  categories: AdviceCategory[];
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name) return;

    try {
      await fetch("/api/admin/advice/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || slugify(name) }),
      });
      toast({ title: "Успех", description: "Категория создана" });
      setName("");
      setSlug("");
      onUpdate();
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить категорию?")) return;

    try {
      await fetch(`/api/admin/advice/categories?id=${id}`, { method: "DELETE" });
      toast({ title: "Успех", description: "Категория удалена" });
      onUpdate();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-xl border bg-white flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-slate-500">{c.slug}</div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(c.id)}
            >
              Удалить
            </Button>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-2 text-center text-slate-500 py-8">
            Категорий пока нет
          </div>
        )}
      </div>
    </div>
  );
}
