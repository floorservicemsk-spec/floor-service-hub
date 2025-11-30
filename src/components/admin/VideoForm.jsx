import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Youtube, Video as VideoIcon } from "lucide-react";

// Утилита для парсинга URL
const parseVideoUrl = (url) => {
  let platform = 'unknown';
  let embed_url = '';

  // YouTube
  let match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  if (match && match[2].length === 11) {
    platform = 'youtube';
    embed_url = `https://www.youtube.com/embed/${match[2]}`;
    return { platform, embed_url };
  }

  // Rutube
  match = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9_]+)/);
  if (match && match[1]) {
    platform = 'rutube';
    embed_url = `https://rutube.ru/play/embed/${match[1]}`;
    return { platform, embed_url };
  }

  // VK
  match = url.match(/vk\.com\/video(-?\d+)_(\d+)/);
  if (match && match[1] && match[2]) {
    platform = 'vk';
    embed_url = `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}`;
    return { platform, embed_url };
  }

  return { platform, embed_url };
};

export default function VideoForm({ item, categories, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    platform: "unknown",
    embed_url: "",
    categories: [],
    is_published: true,
    order: 0,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        description: item.description || "",
        url: item.url || "",
        platform: item.platform || "unknown",
        embed_url: item.embed_url || "",
        categories: item.categories || [],
        is_published: item.is_published !== false,
        order: item.order || 0,
      });
    }
  }, [item]);

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    const { platform, embed_url } = parseVideoUrl(newUrl);
    setFormData(prev => ({
      ...prev,
      url: newUrl,
      platform,
      embed_url,
    }));
  };

  const handleCategoryChange = (categoryId) => {
    const newCategories = formData.categories.includes(categoryId)
      ? formData.categories.filter(id => id !== categoryId)
      : [...formData.categories, categoryId];
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.embed_url) {
      alert("Заполните название и вставьте корректную ссылку на видео.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Card className="mb-6 bg-slate-50/50 border-slate-200">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{item ? "Редактировать видео" : "Добавить видео"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Вставьте ссылку на видео с YouTube, Rutube или VK.
            </AlertDescription>
          </Alert>
          <div>
            <Label htmlFor="title">Название *</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
          </div>
          <div>
            <Label htmlFor="url">Ссылка на видео *</Label>
            <Input id="url" value={formData.url} onChange={handleUrlChange} required placeholder="https://www.youtube.com/watch?v=..."/>
            {formData.platform !== 'unknown' && (
              <p className="text-sm text-green-600 mt-1">Платформа определена: {formData.platform}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          <div>
            <Label>Категории</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox id={`cat-${cat.id}`} checked={formData.categories.includes(cat.id)} onCheckedChange={() => handleCategoryChange(cat.id)} />
                  <Label htmlFor={`cat-${cat.id}`}>{cat.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="is_published" checked={formData.is_published} onCheckedChange={(checked) => setFormData({...formData, is_published: checked})} />
            <Label htmlFor="is_published">Опубликовать видео</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
          <Button type="submit">Сохранить</Button>
        </CardFooter>
      </form>
    </Card>
  );
}