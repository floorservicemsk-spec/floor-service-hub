import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export default function FAQForm({ item, categories, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    categories: [],
    order: 0,
    is_published: true,
    keywords: []
  });
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (item) {
      setFormData({
        question: item.question || "",
        answer: item.answer || "",
        categories: item.categories || [],
        order: item.order || 0,
        is_published: item.is_published !== false,
        keywords: item.keywords || []
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim()) {
      alert("Вопрос и ответ обязательны для заполнения");
      return;
    }

    onSubmit(formData);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <Card className="mb-6 bg-green-50/50 border-green-200">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{item ? "Редактировать вопрос" : "Добавить новый вопрос"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="question">Вопрос *</Label>
            <Input 
              id="question" 
              name="question" 
              value={formData.question} 
              onChange={handleChange} 
              required 
              placeholder="Введите вопрос"
            />
          </div>

          <div>
            <Label htmlFor="answer">Ответ *</Label>
            <Textarea 
              id="answer" 
              name="answer" 
              value={formData.answer} 
              onChange={handleChange}
              required
              placeholder="Введите подробный ответ"
              rows={6}
            />
          </div>

          <div>
            <Label>Категории</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={formData.categories.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <Label htmlFor={category.id} className="text-sm">
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="keywords">Ключевые слова для поиска</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Добавить ключевое слово"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" variant="outline" onClick={addKeyword}>
                Добавить
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.keywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeKeyword(keyword)}
                  />
                </Badge>
              ))}
            </div>
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
                id="is_published" 
                checked={formData.is_published} 
                onCheckedChange={(checked) => setFormData(prev => ({...prev, is_published: checked}))}
              />
              <Label htmlFor="is_published">Опубликован</Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit">
            Сохранить
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}