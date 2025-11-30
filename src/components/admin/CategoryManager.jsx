import React, { useState, useEffect } from "react";
import { FAQCategory } from "@/entities/FAQCategory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FolderOpen } from "lucide-react";

export default function CategoryManager({ onUpdate }) {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    order: 0,
    is_active: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await FAQCategory.list("order");
      setCategories(data);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Название категории обязательно");
      return;
    }

    try {
      if (editingItem) {
        await FAQCategory.update(editingItem.id, formData);
      } else {
        await FAQCategory.create(formData);
      }
      
      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: "", description: "", order: 0, is_active: true });
      await loadCategories();
      onUpdate();
    } catch (error) {
      console.error("Ошибка сохранения категории:", error);
      alert("Ошибка при сохранении категории");
    }
  };

  const handleEdit = (category) => {
    setEditingItem(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      order: category.order || 0,
      is_active: category.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm("Вы уверены, что хотите удалить эту категорию?")) {
      try {
        await FAQCategory.delete(categoryId);
        await loadCategories();
        onUpdate();
      } catch (error) {
        console.error("Ошибка удаления категории:", error);
        alert("Ошибка при удалении категории");
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({ name: "", description: "", order: 0, is_active: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Категории FAQ</h3>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить категорию
        </Button>
      </div>

      {showForm && (
        <Card className="bg-blue-50/50 border-blue-200">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>
                {editingItem ? "Редактировать категорию" : "Новая категория"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Название *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Название категории"
                />
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange}
                  placeholder="Описание категории"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order">Порядок отображения</Label>
                  <Input 
                    id="order" 
                    name="order" 
                    type="number"
                    value={formData.order} 
                    onChange={handleChange} 
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox 
                    id="is_active" 
                    checked={formData.is_active} 
                    onCheckedChange={(checked) => setFormData(prev => ({...prev, is_active: checked}))}
                  />
                  <Label htmlFor="is_active">Активная</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Отмена
              </Button>
              <Button type="submit">
                Сохранить
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Нет категорий</h3>
          <p className="text-slate-500">Создайте первую категорию для FAQ</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {categories.map(category => (
            <Card key={category.id} className="bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">{category.name}</h4>
                      <Badge variant="outline">#{category.order || 0}</Badge>
                      {category.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Активная</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивная</Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-slate-600 text-sm">{category.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(category)}
                      className="hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(category.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}