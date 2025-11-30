import React, { useState, useEffect } from "react";
import { VideoCategory } from "@/entities/VideoCategory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function VideoCategoryManager({ onUpdate }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await VideoCategory.list("order");
      setCategories(data);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category) => {
    const dataToSave = { ...category };
    delete dataToSave.isEditing;
    try {
      await VideoCategory.update(category.id, dataToSave);
      await loadCategories();
      setEditingCategory(null);
    } catch (error) {
      console.error("Ошибка сохранения категории:", error);
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await VideoCategory.create({ name: newCategoryName, is_active: true });
      setNewCategoryName("");
      await loadCategories();
      if(onUpdate) onUpdate();
    } catch (error) {
      console.error("Ошибка создания категории:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Удалить категорию?")) {
      try {
        await VideoCategory.delete(id);
        await loadCategories();
        if(onUpdate) onUpdate();
      } catch (error) {
        console.error("Ошибка удаления категории:", error);
      }
    }
  };

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle>Категории видео</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-2 border rounded-md">
                <Checkbox checked={cat.is_active} onCheckedChange={(checked) => handleSave({...cat, is_active: checked})}/>
                {editingCategory?.id === cat.id ? (
                  <Input value={editingCategory.name} onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})} />
                ) : (
                  <span className="flex-1">{cat.name}</span>
                )}
                
                {editingCategory?.id === cat.id ? (
                   <Button size="sm" onClick={() => handleSave(editingCategory)}>Сохранить</Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setEditingCategory({...cat})}><Edit className="w-4 h-4" /></Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Input placeholder="Новая категория..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
          <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
        </div>
      </CardContent>
    </Card>
  );
}