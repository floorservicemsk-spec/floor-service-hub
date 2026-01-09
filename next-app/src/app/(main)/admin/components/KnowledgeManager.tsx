"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  Copy,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface KnowledgeItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type: string;
  url?: string;
  fileUrl?: string;
  imageUrl?: string;
  categories: string[];
  articleCode?: string;
  isPublic: boolean;
  isAiSource: boolean;
  xmlData?: unknown;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_OPTIONS = [
  { value: "DOCUMENT", label: "Документ" },
  { value: "XML_FEED", label: "XML фид" },
  { value: "ARTICLE", label: "Статья" },
  { value: "LINK", label: "Ссылка" },
  { value: "FILE", label: "Файл" },
];

export default function KnowledgeManager() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/knowledge");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error loading knowledge base:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить базу знаний",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.url?.toLowerCase().includes(query) ||
        item.articleCode?.toLowerCase().includes(query) ||
        item.categories?.some((cat) => cat.toLowerCase().includes(query))
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  const handleSave = async (data: Partial<KnowledgeItem>) => {
    try {
      if (editingItem) {
        await fetch(`/api/admin/knowledge/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast({ title: "Успех", description: "Элемент обновлён" });
      } else {
        await fetch("/api/admin/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast({ title: "Успех", description: "Элемент создан" });
      }
      setShowForm(false);
      setEditingItem(null);
      loadItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот элемент?")) return;

    try {
      await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      toast({ title: "Успех", description: "Элемент удалён" });
      loadItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  const handleClone = (item: KnowledgeItem) => {
    setEditingItem({
      ...item,
      id: "",
      title: `${item.title} (копия)`,
    });
    setShowForm(true);
  };

  const handleSyncXml = async (id: string) => {
    setSyncing(id);
    try {
      const result = await api.syncXmlFeed(id);
      if (result.success) {
        toast({
          title: "Синхронизация завершена",
          description: `Загружено ${result.products_count || 0} товаров`,
        });
        loadItems();
      }
    } catch (error) {
      console.error("Error syncing XML:", error);
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось синхронизировать XML",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Управление базой знаний
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Поиск по названию, описанию, URL, артикулу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-slate-600">
                Найдено: {filteredItems.length} из {items.length}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Категории</TableHead>
                  <TableHead>Публичный</TableHead>
                  <TableHead>Источник ИИ</TableHead>
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
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-10" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-10" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-24 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      {searchQuery ? "Ничего не найдено" : "База знаний пуста"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        {item.articleCode && (
                          <div className="text-xs text-slate-500">
                            {item.articleCode}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TYPE_OPTIONS.find((t) => t.value === item.type)?.label ||
                            item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.categories?.map((cat) => (
                          <Badge key={cat} variant="secondary" className="mr-1">
                            {cat}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <span className={item.isPublic ? "text-green-600" : "text-slate-400"}>
                          {item.isPublic ? "Да" : "Нет"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={item.isAiSource ? "text-blue-600" : "text-slate-400"}>
                          {item.isAiSource ? "Да" : "Нет"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {item.type === "XML_FEED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncXml(item.id)}
                              disabled={syncing === item.id}
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${syncing === item.id ? "animate-spin" : ""}`}
                              />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleClone(item)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingItem(item);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
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
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? "Редактирование" : "Создание"} элемента
            </DialogTitle>
          </DialogHeader>
          <KnowledgeForm
            item={editingItem}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KnowledgeForm({
  item,
  onSave,
  onCancel,
}: {
  item: KnowledgeItem | null;
  onSave: (data: Partial<KnowledgeItem>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: item?.title || "",
    description: item?.description || "",
    content: item?.content || "",
    type: item?.type || "DOCUMENT",
    url: item?.url || "",
    fileUrl: item?.fileUrl || "",
    imageUrl: item?.imageUrl || "",
    categories: item?.categories?.join(", ") || "",
    articleCode: item?.articleCode || "",
    isPublic: item?.isPublic ?? true,
    isAiSource: item?.isAiSource ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...formData,
      categories: formData.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Название *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Тип</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="content">Содержимое</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="fileUrl">URL файла</Label>
          <Input
            id="fileUrl"
            value={formData.fileUrl}
            onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="imageUrl">URL изображения</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="articleCode">Артикул</Label>
          <Input
            id="articleCode"
            value={formData.articleCode}
            onChange={(e) =>
              setFormData({ ...formData, articleCode: e.target.value })
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="categories">Категории (через запятую)</Label>
        <Input
          id="categories"
          value={formData.categories}
          onChange={(e) =>
            setFormData({ ...formData, categories: e.target.value })
          }
          placeholder="материалы, инструкции, ..."
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="isPublic"
            checked={formData.isPublic}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isPublic: checked })
            }
          />
          <Label htmlFor="isPublic">Публичный</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="isAiSource"
            checked={formData.isAiSource}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isAiSource: checked })
            }
          />
          <Label htmlFor="isAiSource">Источник для ИИ</Label>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
