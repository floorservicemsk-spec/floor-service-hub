"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/context/UserContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { User, Award, Star, TrendingUp } from "lucide-react";

function DealerStatusCard() {
  const { user, dealerProfile, bonusEnabled, effectiveTier } = useUser();

  if (!user || user.userType !== "DEALER" || !dealerProfile || !bonusEnabled) {
    return null;
  }

  const getTierInfo = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "tier4":
        return {
          name: "Платиновый",
          color: "bg-gradient-to-r from-indigo-500 to-purple-500",
          textColor: "text-indigo-700",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-200",
        };
      case "tier3":
        return {
          name: "Золотой",
          color: "bg-gradient-to-r from-amber-400 to-yellow-500",
          textColor: "text-amber-700",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      case "tier2":
        return {
          name: "Серебряный",
          color: "bg-gradient-to-r from-gray-400 to-slate-500",
          textColor: "text-gray-700",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
      default:
        return {
          name: "Бронзовый",
          color: "bg-gradient-to-r from-orange-400 to-amber-600",
          textColor: "text-orange-700",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
    }
  };

  const tier = effectiveTier || "tier1";
  const tierInfo = getTierInfo(tier);

  return (
    <Card className={`bg-white/70 backdrop-blur-xl border-white/20 shadow-lg mb-6 ${tierInfo.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${tierInfo.textColor}`} />
            Статус дилера
          </CardTitle>
          <Badge className={`${tierInfo.color} text-white`}>
            {tierInfo.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl ${tierInfo.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <Star className={`w-4 h-4 ${tierInfo.textColor}`} />
              <span className="text-sm text-slate-600">Баллы</span>
            </div>
            <p className={`text-2xl font-bold ${tierInfo.textColor}`}>
              {dealerProfile.pointsBalance || 0}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${tierInfo.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`w-4 h-4 ${tierInfo.textColor}`} />
              <span className="text-sm text-slate-600">Оборот (мес)</span>
            </div>
            <p className={`text-2xl font-bold ${tierInfo.textColor}`}>
              {(dealerProfile.monthlyTurnover || 0).toLocaleString("ru-RU")} ₽
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileDetails() {
  const { user, loading: contextLoading, refreshUser } = useUser();
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    city: "",
    retailPoint: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.displayName || user.fullName || "",
        phone: user.phone || "",
        city: user.city || "",
        retailPoint: user.retailPoint || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        displayName: formData.fullName,
        phone: formData.phone,
        city: formData.city,
        retailPoint: formData.retailPoint,
      });

      refreshUser();
      toast({
        title: "Успех!",
        description: "Данные обновлены.",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading || !user) {
    return (
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader>
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle>Личные данные</CardTitle>
        <CardDescription>Обновите вашу контактную информацию.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullName">Имя</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="email">Email (логин)</Label>
              <Input id="email" value={user.email} disabled />
            </div>
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+7 (999) 999-99-99"
              />
            </div>
            <div>
              <Label htmlFor="city">Город</Label>
              <Input id="city" value={formData.city} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="retailPoint">Торговая точка</Label>
              <Input
                id="retailPoint"
                value={formData.retailPoint}
                onChange={handleChange}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AccountProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">
            Личные данные
          </h1>
          <p className="text-slate-600 mt-1">
            Управление вашей личной информацией
          </p>
        </div>

        <DealerStatusCard />
        <ProfileDetails />
      </div>
    </div>
  );
}
