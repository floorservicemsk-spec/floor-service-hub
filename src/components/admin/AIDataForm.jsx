
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";

export default function AIDataForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "link",
    url: "",
    file_url: "",
    image_url: "",
    content: "",
    categories: [],
    article_code: "",
    is_public: true,
    is_ai_source: true, // Always true for this form
  });
  const [categoriesInput, setCategoriesInput] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        description: item.description || "",
        type: item.type || "link",
        url: item.url || "",
        file_url: item.file_url || "",
        image_url: item.image_url || "",
        content: item.content || "",
        categories: item.categories || [],
        article_code: item.article_code || "",
        is_public: item.is_public !== false,
        is_ai_source: true,
      });
      setCategoriesInput((item.categories || []).join(', '));
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoriesChange = (e) => {
    const value = e.target.value;
    setCategoriesInput(value);
    setFormData(prev => ({ 
      ...prev, 
      categories: value.split(',').map(c => c.trim()).filter(c => c.length > 0)
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert("Название обязательно для заполнения");
      return;
    }

    setIsUploading(true);
    let finalData = { ...formData };
    
    try {
      if (file && formData.type === 'document') {
        const { file_url } = await UploadFile({ file });
        finalData.file_url = file_url;
        
        try {
          const schema = {
            type: "object",
            properties: { 
              content: { 
                type: "string", 
                description: "The full text content of the document." 
              } 
            }
          };
          const extractionResult = await ExtractDataFromUploadedFile({ 
            file_url, 
            json_schema: schema 
          });
          
          if (extractionResult.status === 'success' && extractionResult.output?.content) {
            finalData.content = extractionResult.output.content;
          }
        } catch (extractError) {
          console.warn("Не удалось извлечь текст из файла:", extractError);
        }
      }
      
      await onSubmit(finalData);
    } catch (error) {
      console.error("Ошибка при обработке:", error);
      alert("Ошибка при сохранении данных");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="mb-6 bg-slate-50/50 border-slate-200">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{item ? "Редактировать источник" : "Добавить источник для ИИ"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Название *</Label>
              <Input 
                id="title" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                required 
                placeholder="Название источника"
              />
            </div>
            <div>
              <Label htmlFor="type">Тип</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({...prev, type: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Ссылка</SelectItem>
                  <SelectItem value="document">Документ</SelectItem>
                  <SelectItem value="yandex_disk">Яндекс.Диск</SelectItem>
                  <SelectItem value="xml_feed">XML Фид</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              placeholder="Краткое описание источника"
              rows={3}
            />
          </div>

          {(formData.type === 'link' || formData.type === 'xml_feed') && (
            <div>
              <Label htmlFor="url">
                {formData.type === 'xml_feed' ? 'URL XML Фида' : 'URL ссылки'}
              </Label>
              <Input 
                id="url" 
                name="url" 
                type="url" 
                value={formData.url} 
                onChange={handleChange} 
                placeholder="https://example.com"
                required={formData.type === 'xml_feed'}
              />
            </div>
          )}

          {formData.type === 'document' && (
            <div>
              <Label htmlFor="file">Загрузить документ</Label>
              <Input 
                id="file" 
                type="file" 
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
              />
              {formData.file_url && (
                <p className="text-xs text-slate-500 mt-1">
                  Текущий файл: {formData.file_url.split('/').pop()}
                </p>
              )}
            </div>
          )}

          {formData.type === 'yandex_disk' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="article_code">Артикул</Label>
                <Input 
                  id="article_code" 
                  name="article_code" 
                  value={formData.article_code} 
                  onChange={handleChange} 
                  placeholder="MS110"
                />
              </div>
              <div>
                <Label htmlFor="url">Прямая ссылка на Яндекс.Диск</Label>
                <Input 
                  id="url" 
                  name="url" 
                  type="url" 
                  value={formData.url} 
                  onChange={handleChange} 
                  placeholder="https://disk.yandex.ru/d/..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Уникальная ссылка на файл или папку с материалами по артикулу.
                </p>
              </div>
            </div>
          )}

          {/* This content field is left for document type or manual input if needed, 
              but automatic extraction/sync is removed. */}
          {/* If the content is primarily derived from file extraction or XML, 
              it might be set via `finalData.content` in handleSubmit. */}
          <div>
            <Label htmlFor="content">Контент для ИИ (заполняется автоматически или вручную)</Label>
            <Textarea 
              id="content" 
              name="content" 
              value={formData.content} 
              onChange={handleChange}
              placeholder="Текстовое содержимое для анализа ИИ..."
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Этот текст будет использоваться ИИ для поиска релевантной информации
            </p>
          </div>

          <div>
            <Label htmlFor="image_url">URL изображения (для предпросмотра)</Label>
            <Input 
              id="image_url" 
              name="image_url" 
              value={formData.image_url} 
              onChange={handleChange} 
              placeholder="https://example.com/image.png"
            />
          </div>

          <div>
            <Label htmlFor="categories">Категории (через запятую)</Label>
            <Input 
              id="categories" 
              value={categoriesInput} 
              onChange={handleCategoriesChange}
              placeholder="документация, руководства, каталог"
            />
          </div>

          <div className="flex items-center space-x-6 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_public" 
                checked={formData.is_public} 
                onCheckedChange={(checked) => setFormData(prev => ({...prev, is_public: checked}))}
              />
              <Label htmlFor="is_public">Публичный (виден пользователям)</Label>
            </div>
            {/* is_ai_source is always true, no need for a checkbox here */}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
