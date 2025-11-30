
import React, { useState, useEffect } from "react";
import { KnowledgeBase } from "@/entities/KnowledgeBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Database, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { syncXmlFeed } from "@/functions/syncXmlFeed";
// import { syncLinkContent } from "@/functions/syncLinkContent"; // Временно отключаем

import AIDataForm from "./AIDataForm";
import AIDataList from "./AIDataList";

export default function AIDataManager() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [syncingId, setSyncingId] = useState(null); // New state

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, items]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Загружаем только элементы, которые используются как источники для ИИ
      const data = await KnowledgeBase.filter({ is_ai_source: true }, "-created_date");
      setItems(data);
    } catch (error) {
      console.error("Ошибка загрузки данных для ИИ:", error);
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
    if (window.confirm("Вы уверенны, что хотите удалить этот источник? Это действие необратимо.")) {
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

  // Updated function - только для XML фидов пока
  const handleSync = async (itemToSync) => {
    setSyncingId(itemToSync.id);
    try {
      let response;
      if (itemToSync.type === 'xml_feed') {
        response = await syncXmlFeed({ knowledgeBaseId: itemToSync.id });
      } else {
        // Для других типов показываем сообщение
        alert("Синхронизация для этого типа контента пока не доступна.");
        setSyncingId(null);
        return;
      }
      
      const { data } = response;

      if (data.success) {
        let successMessage = "Синхронизация успешна!";
        if (data.products_count) {
          successMessage = `Синхронизация успешна! Загружено ${data.products_count} товаров.`;
        }
        alert(successMessage);
        
        // Reload all items to get fresh data
        const reloadedItems = await KnowledgeBase.filter({ is_ai_source: true }, "-created_date");
        setItems(reloadedItems);
        
        // If the form for the synced item is open, update its content
        if (showForm && editingItem && editingItem.id === itemToSync.id) {
            const updatedItemData = reloadedItems.find(i => i.id === itemToSync.id);
            if (updatedItemData) {
                setEditingItem(updatedItemData);
            }
        }
      } else {
        throw new Error(data.error || 'Unknown error during sync');
      }
    } catch (error) {
      console.error("Ошибка синхронизации:", error);
      alert(`Ошибка синхронизации: ${error.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      // Всегда устанавливаем is_ai_source в true для этой вкладки
      const aiData = { ...data, is_ai_source: true };
      
      if (editingItem) {
        await KnowledgeBase.update(editingItem.id, aiData);
      } else {
        await KnowledgeBase.create(aiData);
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
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-grow">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-red-600" />
              Данные для ИИ
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Источники знаний, которые ИИ использует для ответов пользователям
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadItems}
              disabled={loading}
              className="flex-grow md:flex-grow-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="flex-grow md:flex-grow-0">
              <Plus className="w-4 h-4 mr-2" />
              Добавить источник
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Database className="h-4 w-4" />
            <AlertDescription>
              Эти данные используются ИИ-ассистентом для формирования ответов. 
              Добавляйте сюда ссылки на сайты, документы и другие источники знаний.
            </AlertDescription>
          </Alert>

          {/* Поиск */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
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

          {showForm && (
            <AIDataForm
              item={editingItem}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          )}
          
          <AIDataList 
            items={filteredItems}
            loading={loading}
            syncingId={syncingId} // New prop
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClone={handleClone}
            onSync={handleSync} // New prop
          />
        </CardContent>
      </Card>
    </div>
  );
}
