
import React, { useEffect, useMemo, useState } from "react";
import { AdviceArticle } from "@/entities/AdviceArticle";
import { AdviceCategory } from "@/entities/AdviceCategory";
import { AdviceMedia } from "@/entities/AdviceMedia";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, RefreshCw, Save, Trash2, ImagePlus } from "lucide-react";

const slugify = (s) => s.toString().toLowerCase().trim()
  .replace(/\s+/g, "-").replace(/[^a-z0-9\-а-яё]/gi, "").replace(/-+/g, "-");

export default function TipsAdmin() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const [articles, categories] = await Promise.all([
      AdviceArticle.list("-updated_date"),
      AdviceCategory.list("name")
    ]);
    setItems(articles);
    setCats(categories);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const t = q.toLowerCase();
    return items.filter(a => (a.title + " " + (a.summary || "")).toLowerCase().includes(t));
  }, [items, q]);

  const blank = {
    type: "article",
    title: "",
    slug: "",
    summary: "",
    category_ids: [],
    html: "<p>Новый материал</p>",
    checklist: [],
    is_public: true,
    status: "draft",
    allowed_user_types: ["client", "dealer", "manager"]
  };

  const save = async () => {
    if (!editing.title) return alert("Заполните заголовок");
    const payload = { ...editing, slug: editing.slug || slugify(editing.title) };
    if (editing.id) await AdviceArticle.update(editing.id, payload);
    else {
      const created = await AdviceArticle.create(payload);
      setEditing(created);
    }
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить материал?")) return;
    await AdviceArticle.delete(id);
    await load();
    setEditing(null);
  };

  const uploadCover = async (file) => {
    const { file_url } = await UploadFile({ file });
    const media = await AdviceMedia.create({ type: "image", url: file_url, title: editing.title + " cover" });
    setEditing(prev => ({ ...prev, cover_media_id: media.id }));
  };

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle>Советы</CardTitle>
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
              <Input placeholder="Поиск..." value={q} onChange={e => setQ(e.target.value)} />
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Обновить
              </Button>
              <Button onClick={() => setEditing(blank)}><Plus className="w-4 h-4 mr-2" />Создать</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(a => (
                <div key={a.id} className="p-4 rounded-xl border bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-xs text-slate-500">{a.slug} • {a.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Редактировать</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="edit" className="mt-6">
            {!editing ? (
              <div className="text-slate-500">Выберите материал в списке или создайте новый.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Заголовок" />
                  <Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="slug" />
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Статья</SelectItem>
                      <SelectItem value="checklist">Чек‑лист</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue placeholder="Статус" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Черновик</SelectItem>
                      <SelectItem value="published">Опубликовано</SelectItem>
                      <SelectItem value="archived">Архив</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="md:col-span-2">
                    <Textarea rows={3} placeholder="Краткий анонс" value={editing.summary || ""} onChange={e => setEditing({ ...editing, summary: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600 mb-1 block">Категории</label>
                    <div className="flex flex-wrap gap-2">
                      {cats.map(c => {
                        const active = (editing.category_ids || []).includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const set = new Set(editing.category_ids || []);
                              active ? set.delete(c.id) : set.add(c.id);
                              setEditing({ ...editing, category_ids: Array.from(set) });
                            }}
                            className={`text-sm px-3 py-1 rounded-full border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'}`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600 mb-1 block">Доступ по типам пользователей</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: "client", label: "Клиент" },
                        { key: "dealer", label: "Дилер" },
                        { key: "manager", label: "Менеджер" }
                      ].map(r => {
                        // Use editing.allowed_user_types or default to empty array to correctly manage state
                        const active = (editing.allowed_user_types || []).includes(r.key);
                        return (
                          <label key={r.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'}`}>
                            <Checkbox
                              checked={active}
                              onCheckedChange={(v) => {
                                // Ensure allowed_user_types is always an array
                                const currentTypes = new Set(editing.allowed_user_types || []);
                                if (v) {
                                  currentTypes.add(r.key);
                                } else {
                                  currentTypes.delete(r.key);
                                }
                                setEditing({ ...editing, allowed_user_types: Array.from(currentTypes) });
                              }}
                            />
                            <span className="text-sm">{r.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Администраторы всегда имеют доступ, независимо от выбора.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600 mb-1 block">Обложка</label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => document.getElementById('cover-input').click()}>
                        <ImagePlus className="w-4 h-4 mr-2" /> Загрузить
                      </Button>
                      <input id="cover-input" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                      {editing.cover_media_id && <span className="text-xs text-slate-500">ID: {editing.cover_media_id}</span>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600 mb-1 block">HTML‑контент</label>
                    <Textarea rows={10} value={editing.html || ""} onChange={e => setEditing({ ...editing, html: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Checkbox checked={!!editing.is_public} onCheckedChange={(v) => setEditing({ ...editing, is_public: !!v })} />
                    <span className="text-sm">Публичный материал</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={save}><Save className="w-4 h-4 mr-2" />Сохранить</Button>
                  {editing.id && <Button variant="destructive" onClick={() => remove(editing.id)}><Trash2 className="w-4 h-4 mr-2" />Удалить</Button>}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <TipsCategories />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TipsCategories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const cats = await AdviceCategory.list("name");
    setItems(cats);
    setLoading(false);
  };

  const create = async () => {
    if (!name) return;
    const created = await AdviceCategory.create({ name, slug: slug || slugify(name) });
    setItems(prev => [created, ...prev]);
    setName(""); setSlug("");
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить категорию?")) return;
    await AdviceCategory.delete(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Название" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="slug" value={slug} onChange={e => setSlug(e.target.value)} />
        <Button onClick={create}><Plus className="w-4 h-4 mr-1" />Добавить</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(i => (
          <div key={i.id} className="p-4 rounded-xl border bg-white flex items-center justify-between">
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-slate-500">{i.slug}</div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => remove(i.id)}>Удалить</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
