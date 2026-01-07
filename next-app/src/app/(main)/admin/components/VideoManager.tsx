"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, RefreshCw, Pencil, Trash2, Video as VideoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  embedUrl?: string;
  platform?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  order: number;
  isActive: boolean;
  isPublished: boolean;
  allowedUserTypes: string[];
}

interface VideoCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}

const USER_TYPES = [
  { key: "CLIENT", label: "Клиент" },
  { key: "DEALER", label: "Дилер" },
  { key: "MANAGER", label: "Менеджер" },
];

export default function VideoManager() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Video | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(
    null
  );
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/video");
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить видео",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveVideo = async (data: Partial<Video>) => {
    try {
      if (editingItem?.id) {
        await fetch("/api/admin/video", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...data }),
        });
        toast({ title: "Успех", description: "Видео обновлено" });
      } else {
        await fetch("/api/admin/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast({ title: "Успех", description: "Видео создано" });
      }
      setShowForm(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error("Error saving video:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Удалить это видео?")) return;

    try {
      await fetch(`/api/admin/video?id=${id}`, { method: "DELETE" });
      toast({ title: "Успех", description: "Видео удалено" });
      loadData();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  const handleSaveCategory = async (data: Partial<VideoCategory>) => {
    try {
      if (editingCategory?.id) {
        await fetch("/api/admin/video/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategory.id, ...data }),
        });
        toast({ title: "Успех", description: "Категория обновлена" });
      } else {
        await fetch("/api/admin/video/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast({ title: "Успех", description: "Категория создана" });
      }
      setShowCategoryForm(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Удалить эту категорию?")) return;

    try {
      await fetch(`/api/admin/video/categories?id=${id}`, { method: "DELETE" });
      toast({ title: "Успех", description: "Категория удалена" });
      loadData();
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
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="w-5 h-5" />
            Управление Видео
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="videos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="videos">Видео</TabsTrigger>
              <TabsTrigger value="categories">Категории видео</TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">
                  Все видео ({videos.length})
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadData}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Обновить
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingItem(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить видео
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Доступ</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-48" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-8 w-20 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                    ) : videos.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-slate-500 py-8"
                        >
                          Видео пока нет
                        </TableCell>
                      </TableRow>
                    ) : (
                      videos.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell>
                            <div className="font-medium">{video.title}</div>
                            {video.platform && (
                              <div className="text-xs text-slate-500">
                                {video.platform}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {video.categoryId && (
                              <Badge variant="secondary">
                                {categories.find((c) => c.id === video.categoryId)
                                  ?.name || "—"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {video.allowedUserTypes?.map((type) => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {USER_TYPES.find((t) => t.key === type)?.label ||
                                    type}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(video);
                                  setShowForm(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteVideo(video.id)}
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
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">
                  Категории ({categories.length})
                </h3>
                <Button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить категорию
                </Button>
              </div>

              <div className="rounded-lg border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead>Порядок</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-slate-500 py-8"
                        >
                          Категорий пока нет
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-slate-500">
                            {cat.description || "—"}
                          </TableCell>
                          <TableCell>{cat.order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setShowCategoryForm(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteCategory(cat.id)}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Video Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? "Редактирование" : "Добавление"} видео
            </DialogTitle>
          </DialogHeader>
          <VideoForm
            item={editingItem}
            categories={categories}
            onSave={handleSaveVideo}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? "Редактирование" : "Создание"} категории
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            item={editingCategory}
            onSave={handleSaveCategory}
            onCancel={() => {
              setShowCategoryForm(false);
              setEditingCategory(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoForm({
  item,
  categories,
  onSave,
  onCancel,
}: {
  item: Video | null;
  categories: VideoCategory[];
  onSave: (data: Partial<Video>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: item?.title || "",
    description: item?.description || "",
    url: item?.url || "",
    embedUrl: item?.embedUrl || "",
    platform: item?.platform || "",
    thumbnailUrl: item?.thumbnailUrl || "",
    categoryId: item?.categoryId || "",
    order: item?.order || 0,
    allowedUserTypes: item?.allowedUserTypes || ["CLIENT", "DEALER", "MANAGER"],
  });
  const [saving, setSaving] = useState(false);

  const toggleUserType = (type: string) => {
    setFormData((prev) => {
      const types = new Set(prev.allowedUserTypes);
      if (types.has(type)) {
        types.delete(type);
      } else {
        types.add(type);
      }
      return { ...prev, allowedUserTypes: Array.from(types) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
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
        <Label htmlFor="url">URL видео *</Label>
        <Input
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          required
        />
      </div>

      <div>
        <Label htmlFor="embedUrl">Embed URL</Label>
        <Input
          id="embedUrl"
          value={formData.embedUrl}
          onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
          placeholder="https://youtube.com/embed/..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="platform">Платформа</Label>
          <Input
            id="platform"
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            placeholder="YouTube, Vimeo, ..."
          />
        </div>
        <div>
          <Label htmlFor="categoryId">Категория</Label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) =>
              setFormData({ ...formData, categoryId: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="thumbnailUrl">URL превью</Label>
        <Input
          id="thumbnailUrl"
          value={formData.thumbnailUrl}
          onChange={(e) =>
            setFormData({ ...formData, thumbnailUrl: e.target.value })
          }
          placeholder="https://..."
        />
      </div>

      <div>
        <Label>Доступ по типам пользователей</Label>
        <div className="flex flex-wrap gap-3 mt-2">
          {USER_TYPES.map((r) => {
            const active = formData.allowedUserTypes.includes(r.key);
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
          Администраторы всегда имеют доступ.
        </p>
      </div>

      <div>
        <Label htmlFor="order">Порядок</Label>
        <Input
          id="order"
          type="number"
          value={formData.order}
          onChange={(e) =>
            setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
          }
        />
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

function CategoryForm({
  item,
  onSave,
  onCancel,
}: {
  item: VideoCategory | null;
  onSave: (data: Partial<VideoCategory>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || "",
    description: item?.description || "",
    order: item?.order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Название *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="order">Порядок</Label>
        <Input
          id="order"
          type="number"
          value={formData.order}
          onChange={(e) =>
            setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
          }
        />
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
