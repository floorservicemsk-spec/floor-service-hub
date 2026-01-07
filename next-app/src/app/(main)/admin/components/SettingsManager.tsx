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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Settings,
  Key,
  Zap,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface AISettings {
  id: string;
  provider: string;
  apiKey: string | null;
  hasApiKey: boolean;
  baseUrl: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  welcomeMessage: string | null;
  yandexDiskPath: string | null;
  useOnlyKnowledgeBase: boolean;
  enableExternalSearch: boolean;
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"] },
  { value: "gemini", label: "Google Gemini", models: ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"] },
  { value: "custom", label: "Custom (OpenAI-совместимый)", models: [] },
];

export default function SettingsManager() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setNewApiKey(""); // Reset new API key input
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

  const handleProviderChange = (provider: string) => {
    setSettings((prev) => {
      if (!prev) return null;
      
      // Get default model for the provider
      const providerConfig = PROVIDERS.find((p) => p.value === provider);
      const defaultModel = providerConfig?.models[0] || prev.model;
      
      // Reset base URL for non-custom providers
      const baseUrl = provider === "custom" ? prev.baseUrl : null;
      
      return { ...prev, provider, model: defaultModel, baseUrl };
    });
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          apiKey: newApiKey || settings.apiKey, // Send new key if provided
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Настройки успешно сохранены!" });
        setNewApiKey("");
        loadSettings(); // Reload to get masked key
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

  const handleTestConnection = async () => {
    if (!settings) return;

    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/ai-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: newApiKey || settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setMessage({ type: "error", text: "Ошибка при тестировании подключения" });
    } finally {
      setTesting(false);
    }
  };

  const currentProvider = PROVIDERS.find((p) => p.value === settings?.provider);

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
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
    <div className="space-y-6">
      {/* API Configuration Card */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Подключение к AI
          </CardTitle>
          <CardDescription>
            Настройка подключения к провайдеру искусственного интеллекта
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
              <Label htmlFor="provider">Провайдер</Label>
              <Select
                value={settings.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="model">Модель</Label>
              {currentProvider?.models.length ? (
                <Select
                  value={settings.model}
                  onValueChange={(v) => handleChange("model", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProvider.models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="model"
                  value={settings.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="apiKey">API Ключ</Label>
              {settings.hasApiKey && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Настроен
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={newApiKey || (settings.hasApiKey ? settings.apiKey || "" : "")}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={settings.hasApiKey ? "Введите новый ключ для замены" : "sk-..."}
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {settings.provider === "openai" && (
                <>Получить ключ: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a></>
              )}
              {settings.provider === "anthropic" && (
                <>Получить ключ: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a></>
              )}
              {settings.provider === "gemini" && (
                <>Получить ключ: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">aistudio.google.com</a></>
              )}
            </p>
          </div>

          {settings.provider === "custom" && (
            <div>
              <Label htmlFor="baseUrl">Base URL (API Endpoint)</Label>
              <Input
                id="baseUrl"
                value={settings.baseUrl || ""}
                onChange={(e) => handleChange("baseUrl", e.target.value)}
                placeholder="https://api.example.com/v1"
              />
              <p className="text-xs text-slate-500 mt-1">
                URL OpenAI-совместимого API (например, для локальных LLM)
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || (!settings.hasApiKey && !newApiKey)}
            >
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Проверить подключение
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Model Settings Card */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Параметры модели
          </CardTitle>
          <CardDescription>
            Настройка поведения ИИ-ассистента
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="temperature">Температура (0.0 - 1.0)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={settings.temperature}
                onChange={(e) =>
                  handleChange("temperature", parseFloat(e.target.value))
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                Чем выше, тем более креативные ответы
              </p>
            </div>
            <div>
              <Label htmlFor="maxTokens">Максимум токенов</Label>
              <Input
                id="maxTokens"
                type="number"
                min="100"
                max="8000"
                value={settings.maxTokens}
                onChange={(e) =>
                  handleChange("maxTokens", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                Максимальная длина ответа
              </p>
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
                checked={settings.useOnlyKnowledgeBase}
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
                checked={settings.enableExternalSearch}
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
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Сохранить настройки
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
