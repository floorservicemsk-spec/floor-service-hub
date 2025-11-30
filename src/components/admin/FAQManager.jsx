
import React, { useState, useEffect } from "react";
import { FAQ } from "@/entities/FAQ";
import { FAQCategory } from "@/entities/FAQCategory";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import FAQForm from "./FAQForm";
import FAQList from "./FAQList";
import CategoryManager from "./CategoryManager";

export default function FAQManager() {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [faqData, categoryData] = await Promise.all([
        FAQ.list("-created_date"),
        FAQCategory.list("order")
      ]);
      setFaqs(faqData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Ошибка загрузки данных FAQ:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm("Вы уверены, что хотите удалить этот вопрос?")) {
      try {
        await FAQ.delete(itemId);
        await loadData();
      } catch (error) {
        console.error("Ошибка удаления вопроса:", error);
        alert("Ошибка при удалении вопроса");
      }
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingItem) {
        await FAQ.update(editingItem.id, data);
      } else {
        await FAQ.create(data);
      }
      setShowForm(false);
      setEditingItem(null);
      await loadData();
    } catch (error) {
      console.error("Ошибка сохранения вопроса:", error);
      alert("Ошибка при сохранении вопроса");
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle>Управление FAQ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="questions">Вопросы и ответы</TabsTrigger>
              <TabsTrigger value="categories">Категории</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions" className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">Вопросы и ответы</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadData}
                    disabled={loading}
                    className="flex-grow sm:flex-grow-0"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Обновить
                  </Button>
                  <Button onClick={() => { setEditingItem(null); setShowForm(true); }} className="flex-grow sm:flex-grow-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить вопрос
                  </Button>
                </div>
              </div>

              {showForm && (
                <FAQForm
                  item={editingItem}
                  categories={categories}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                />
              )}
              
              <FAQList 
                items={faqs}
                categories={categories}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
            
            <TabsContent value="categories" className="mt-6">
              <CategoryManager onUpdate={loadData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
