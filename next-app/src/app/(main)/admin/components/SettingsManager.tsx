"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AISettings {
  id: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  yandexDiskPath?: string;
  welcomeMessage?: string;
  useOnlyKnowledgeBase: boolean;
  enableExternalSearch: boolean;
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage({ type: "error", text: "Ошибка загрузки настроек" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (field: keyof AISettings, value: unknown) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Настройки успешно сохранены!" });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Ошибка при сохранении настроек" });
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
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Настройки ИИ
        </CardTitle>
        <CardDescription>
          Управление поведением и источниками данных для ИИ-ассистента
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="model">Модель ИИ</Label>
            <Input
              id="model"
              value={settings.model || ""}
              onChange={(e) => handleChange("model", e.target.value)}
              placeholder="gpt-4o-mini"
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
              onChange={(e) =>
                handleChange("temperature", parseFloat(e.target.value))
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="systemPrompt">Системный промпт</Label>
          <Textarea
            id="systemPrompt"
            value={settings.systemPrompt || ""}
            onChange={(e) => handleChange("systemPrompt", e.target.value)}
            rows={5}
            placeholder="Описание роли и поведения ИИ-ассистента..."
          />
        </div>

        <div>
          <Label htmlFor="welcomeMessage">Приветственное сообщение</Label>
          <Textarea
            id="welcomeMessage"
            value={settings.welcomeMessage || ""}
            onChange={(e) => handleChange("welcomeMessage", e.target.value)}
            rows={2}
            placeholder="Сообщение, которое видит пользователь при открытии чата"
          />
        </div>

        <div>
          <Label htmlFor="yandexDiskPath">
            Базовый путь к папке на Яндекс.Диске
          </Label>
          <Input
            id="yandexDiskPath"
            value={settings.yandexDiskPath || ""}
            onChange={(e) => handleChange("yandexDiskPath", e.target.value)}
            placeholder="https://disk.yandex.ru/client/disk/..."
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-slate-900">Дополнительные настройки</h3>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="useOnlyKnowledgeBase"
              checked={settings.useOnlyKnowledgeBase || false}
              onCheckedChange={(checked) =>
                handleChange("useOnlyKnowledgeBase", checked)
              }
            />
            <Label htmlFor="useOnlyKnowledgeBase" className="text-sm">
              Использовать только внутреннюю базу знаний
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableExternalSearch"
              checked={settings.enableExternalSearch !== false}
              onCheckedChange={(checked) =>
                handleChange("enableExternalSearch", checked)
              }
            />
            <Label htmlFor="enableExternalSearch" className="text-sm">
              Разрешить поиск по внешним сайтам
            </Label>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </CardFooter>
    </Card>
  );
}
