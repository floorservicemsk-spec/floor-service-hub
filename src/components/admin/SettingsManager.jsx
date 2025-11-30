
import React, { useState, useEffect } from "react";
import { AISettings } from "@/entities/AISettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsManager() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await AISettings.list();
      if (data.length > 0) {
        setSettings(data[0]);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          model: "gpt-4o-mini", // Changed from "gpt-4" to "gpt-4o-mini"
          temperature: 0.7,
          system_prompt: "Вы - ИИ-ассистент, который помогает пользователям найти информацию в базе знаний компании. Отвечайте дружелюбно и профессионально на русском языке. При упоминании артикулов предоставляйте ссылки на соответствующие материалы.",
          yandex_disk_path: "https://disk.yandex.ru/client/disk/!FSCLOUD/!АРТИКУЛЫ%20В%20ИНТЕРЬЕРЕ",
          use_only_knowledge_base: false,
          enable_external_search: true
        };
        const createdSettings = await AISettings.create(defaultSettings);
        setSettings(createdSettings);
      }
    } catch (error) {
      console.error("Ошибка загрузки настроек:", error);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      await AISettings.update(settings.id, settings);
      setMessage({ type: 'success', text: 'Настройки успешно сохранены!' });
    } catch(error) {
      console.error("Ошибка сохранения настроек:", error);
      setMessage({ type: 'error', text: 'Ошибка при сохранении настроек' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Загрузка настроек...</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Не удалось загрузить настройки</p>
          <Button onClick={loadSettings} className="mt-4">
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle>Настройки ИИ</CardTitle>
        <CardDescription>
          Управление поведением и источниками данных для ИИ-ассистента
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="model">Модель ИИ</Label>
            <Input 
              id="model" 
              value={settings.model || ''} 
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder="gpt-4o-mini" // Changed from "gpt-4" to "gpt-4o-mini"
            />
          </div>
          <div>
            <Label htmlFor="temperature">Температура (0.0 - 1.0)</Label>
            <Input 
              id="temperature" 
              type="number" 
              step="0.1" 
              min="0" 
              max="1" 
              value={settings.temperature || 0.7} 
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="system_prompt">Системный промпт</Label>
          <Textarea 
            id="system_prompt" 
            value={settings.system_prompt || ''} 
            onChange={(e) => handleChange('system_prompt', e.target.value)}
            rows={5}
            placeholder="Описание роли и поведения ИИ-ассистента..."
          />
        </div>

        <div>
          <Label htmlFor="yandex_disk_path">Базовый путь к папке на Яндекс.Диске</Label>
          <Input 
            id="yandex_disk_path" 
            value={settings.yandex_disk_path || ''} 
            onChange={(e) => handleChange('yandex_disk_path', e.target.value)}
            placeholder="https://disk.yandex.ru/client/disk/..."
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-slate-900">Дополнительные настройки</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="use_only_knowledge_base" 
              checked={settings.use_only_knowledge_base || false} 
              onCheckedChange={(checked) => handleChange('use_only_knowledge_base', checked)}
            />
            <Label htmlFor="use_only_knowledge_base" className="text-sm">
              Использовать только внутреннюю базу знаний
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="enable_external_search" 
              checked={settings.enable_external_search !== false} 
              onCheckedChange={(checked) => handleChange('enable_external_search', checked)}
            />
            <Label htmlFor="enable_external_search" className="text-sm">
              Разрешить поиск по внешним сайтам
            </Label>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </CardFooter>
    </Card>
  );
}
