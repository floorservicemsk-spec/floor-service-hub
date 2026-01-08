"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser } from "@/components/context/UserContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

interface LegalEntity {
  id: string;
  name: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  address?: string;
  isDefault?: boolean;
}

export default function AccountLegalPage() {
  const { user } = useUser();
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    inn: "",
    kpp: "",
    ogrn: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadEntities = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getLegalEntities();
      setEntities(data);
    } catch (error) {
      console.error("Error loading legal entities:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const openCreateDialog = () => {
    setEditingEntity(null);
    setFormData({ name: "", inn: "", kpp: "", ogrn: "", address: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (entity: LegalEntity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      inn: entity.inn,
      kpp: entity.kpp || "",
      ogrn: entity.ogrn || "",
      address: entity.address || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.inn) {
      toast({
        title: "Ошибка",
        description: "Название и ИНН обязательны",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingEntity) {
        await api.updateLegalEntity(editingEntity.id, formData);
        toast({ title: "Успех!", description: "Организация обновлена." });
      } else {
        await api.createLegalEntity(formData);
        toast({ title: "Успех!", description: "Организация создана." });
      }
      setIsDialogOpen(false);
      loadEntities();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту организацию?")) return;
    try {
      await api.deleteLegalEntity(id);
      toast({ title: "Успех!", description: "Организация удалена." });
      loadEntities();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить организацию.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">
              Юридические лица
            </h1>
            <p className="text-slate-600 mt-1">
              Управление вашими организациями
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 bg-white/60 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : entities.length > 0 ? (
          <div className="space-y-4">
            {entities.map((entity) => (
              <Card
                key={entity.id}
                className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">
                            {entity.name}
                          </h3>
                          {entity.isDefault && (
                            <Badge variant="secondary">По умолчанию</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">
                          ИНН: {entity.inn}
                          {entity.kpp && ` | КПП: ${entity.kpp}`}
                        </p>
                        {entity.address && (
                          <p className="text-sm text-slate-500 mt-1">
                            {entity.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(entity)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entity.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Нет организаций
              </h3>
              <p className="text-slate-600 mb-4">
                Добавьте юридическое лицо для оформления заказов
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить организацию
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEntity ? "Редактировать организацию" : "Новая организация"}
              </DialogTitle>
              <DialogDescription>
                Заполните данные юридического лица
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Название организации *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ООО «Компания»"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inn">ИНН *</Label>
                    <Input
                      id="inn"
                      value={formData.inn}
                      onChange={handleChange}
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kpp">КПП</Label>
                    <Input
                      id="kpp"
                      value={formData.kpp}
                      onChange={handleChange}
                      placeholder="123456789"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ogrn">ОГРН</Label>
                  <Input
                    id="ogrn"
                    value={formData.ogrn}
                    onChange={handleChange}
                    placeholder="1234567890123"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Юридический адрес</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="г. Москва, ул. Примерная, д. 1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
