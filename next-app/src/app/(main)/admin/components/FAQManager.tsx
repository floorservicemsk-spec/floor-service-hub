"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  categoryId?: string;
  keywords: string[];
  order: number;
  isActive: boolean;
  isPublished: boolean;
}

interface FAQCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export default function FAQManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQ | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/faq");
      if (response.ok) {
        const data = await response.json();
        setFaqs(data.faqs);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error loading FAQ:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить FAQ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveFaq = async (data: Partial<FAQ>) => {
    try {
      if (editingItem?.id) {
        await fetch("/api/admin/faq", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...data }),
        });
        toast({ title: "Успех", description: "Вопрос обновлён" });
      } else {
        await fetch("/api/admin/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast({ title: "Успех", description: "Вопрос создан" });
      }
      setShowForm(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Удалить этот вопрос?")) return;

    try {
      await fetch(`/api/admin/faq?id=${id}`, { method: "DELETE" });
      toast({ title: "Успех", description: "Вопрос удалён" });
      loadData();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить",
        variant: "destructive",
      });
    }
  };

  const handleSaveCategory = async (data: Partial<FAQCategory>) => {
    try {
      if (editingCategory?.id) {
        await fetch("/api/admin/faq/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategory.id, ...data }),
        });
        toast({ title: "Успех", description: "Категория обновлена" });
      } else {
        await fetch("/api/admin/faq/categories", {
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
      await fetch(`/api/admin/faq/categories?id=${id}`, { method: "DELETE" });
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
            <HelpCircle className="w-5 h-5" />
            Управление FAQ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="questions">Вопросы и ответы</TabsTrigger>
              <TabsTrigger value="categories">Категории</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">
                  Вопросы и ответы ({faqs.length})
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
                    Добавить вопрос
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Вопрос</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Порядок</TableHead>
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
                              <Skeleton className="h-4 w-12" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-8 w-20 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                    ) : faqs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-slate-500 py-8"
                        >
                          Вопросов пока нет
                        </TableCell>
                      </TableRow>
                    ) : (
                      faqs.map((faq) => (
                        <TableRow key={faq.id}>
                          <TableCell>
                            <div className="font-medium line-clamp-2">
                              {faq.question}
                            </div>
                          </TableCell>
                          <TableCell>
                            {faq.categoryId && (
                              <Badge variant="secondary">
                                {categories.find((c) => c.id === faq.categoryId)
                                  ?.name || "—"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{faq.order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(faq);
                                  setShowForm(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteFaq(faq.id)}
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

      {/* FAQ Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? "Редактирование" : "Создание"} вопроса
            </DialogTitle>
          </DialogHeader>
          <FAQForm
            item={editingItem}
            categories={categories}
            onSave={handleSaveFaq}
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

function FAQForm({
  item,
  categories,
  onSave,
  onCancel,
}: {
  item: FAQ | null;
  categories: FAQCategory[];
  onSave: (data: Partial<FAQ>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    question: item?.question || "",
    answer: item?.answer || "",
    categoryId: item?.categoryId || "",
    keywords: item?.keywords?.join(", ") || "",
    order: item?.order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...formData,
      keywords: formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="question">Вопрос *</Label>
        <Input
          id="question"
          value={formData.question}
          onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="answer">Ответ *</Label>
        <Textarea
          id="answer"
          value={formData.answer}
          onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
          rows={4}
          required
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

      <div>
        <Label htmlFor="keywords">Ключевые слова (через запятую)</Label>
        <Input
          id="keywords"
          value={formData.keywords}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="укладка, материал, ..."
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

function CategoryForm({
  item,
  onSave,
  onCancel,
}: {
  item: FAQCategory | null;
  onSave: (data: Partial<FAQCategory>) => void;
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
