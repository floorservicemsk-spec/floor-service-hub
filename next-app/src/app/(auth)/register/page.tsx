"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
import { MessageSquare, Loader2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/chat";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    fullName: "",
    phone: "",
    city: "",
    userType: "USER",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Пароли не совпадают");
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setErrorMessage("Пароль должен содержать минимум 6 символов");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          displayName: formData.displayName.trim() || undefined,
          fullName: formData.fullName.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          city: formData.city.trim() || undefined,
          userType: formData.userType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Ошибка регистрации");
        return;
      }

      setSuccessMessage(
        data.requiresApproval
          ? "Регистрация успешна! Ваш аккаунт будет активирован после проверки администратором."
          : "Регистрация успешна! Теперь вы можете войти."
      );

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push(`/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }, 2000);
    } catch (err) {
      setErrorMessage("Произошла ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Card className="w-full max-w-md glass-card-l2">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Регистрация</CardTitle>
          <CardDescription>
            Создайте аккаунт для доступа к ИИ-ассистенту
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
                {successMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                autoComplete="email"
                disabled={loading || !!successMessage}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password">Пароль *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading || !!successMessage}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading || !!successMessage}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Имя для отображения</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Иван"
                value={formData.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                autoComplete="given-name"
                disabled={loading || !!successMessage}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Полное имя</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Иван Иванов"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                autoComplete="name"
                disabled={loading || !!successMessage}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  autoComplete="tel"
                  disabled={loading || !!successMessage}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Москва"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  autoComplete="address-level2"
                  disabled={loading || !!successMessage}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">Тип аккаунта</Label>
              <Select
                value={formData.userType}
                onValueChange={(value) => handleChange("userType", value)}
                disabled={loading || !!successMessage}
              >
                <SelectTrigger id="userType">
                  <SelectValue placeholder="Выберите тип аккаунта" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Пользователь</SelectItem>
                  <SelectItem value="DEALER">Дилер</SelectItem>
                  <SelectItem value="MANAGER">Менеджер</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {formData.userType === "DEALER" &&
                  "Аккаунт дилера требует одобрения администратора"}
                {formData.userType === "MANAGER" &&
                  "Аккаунт менеджера требует одобрения администратора"}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff]"
              disabled={loading || !!successMessage}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </Button>

            <div className="text-center text-sm text-slate-600">
              Уже есть аккаунт?{" "}
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
