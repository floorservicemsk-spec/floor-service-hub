
import React, { useState, useEffect } from "react";
import { KnowledgeBase } from "@/entities/KnowledgeBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import KnowledgeForm from "./KnowledgeForm";
import KnowledgeList from "./KnowledgeList";

export default function KnowledgeManager() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, items]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await KnowledgeBase.list("-created_date");
      setItems(data);
    } catch (error) {
      console.error("Ошибка загрузки базы знаний:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item =>
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      (item.article_code && item.article_code.toLowerCase().includes(query)) ||
      (item.categories && item.categories.some(cat => cat.toLowerCase().includes(query)))
    );
    setFilteredItems(filtered);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm("Вы уверены, что хотите удалить этот элемент? Это действие необратимо.")) {
      try {
        await KnowledgeBase.delete(itemId);
        await loadItems();
      } catch (error) {
        console.error("Ошибка удаления элемента:", error);
        alert("Ошибка при удалении элемента");
      }
    }
  };
  
  const handleClone = async (itemToClone) => {
    try {
      // 1. Создаем копию объекта, исключая системные поля
      const { id, created_date, updated_date, ...clonedData } = itemToClone;

      // 2. Добавляем пометку к названию
      clonedData.title = `${clonedData.title} (копия)`;

      // 3. Создаем новый элемент в базе данных
      const newItem = await KnowledgeBase.create(clonedData);

      // 4. Обновляем список, чтобы отобразить новый элемент
      await loadItems();

      // 5. Открываем форму редактирования для нового элемента
      setEditingItem(newItem);
      setShowForm(true);
      
    } catch (error) {
      console.error("Ошибка клонирования элемента:", error);
      alert("Не удалось клонировать элемент.");
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingItem) {
        await KnowledgeBase.update(editingItem.id, data);
      } else {
        await KnowledgeBase.create(data);
      }
      setShowForm(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      console.error("Ошибка сохранения элемента:", error);
      alert("Ошибка при сохранении элемента");
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg lg:text-xl">Управление базой знаний</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadItems}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button 
              onClick={() => { setEditingItem(null); setShowForm(true); }} 
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="w-full">
          {/* Поиск */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Поиск по названию, описанию, URL, артикулу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-slate-600">
                Найдено: {filteredItems.length} из {items.length}
              </div>
            )}
          </div>

          {showForm && (
            <div className="mb-6">
              <KnowledgeForm
                item={editingItem}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            </div>
          )}
          
          <div className="admin-table-container">
            <KnowledgeList 
              items={filteredItems}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClone={handleClone}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
