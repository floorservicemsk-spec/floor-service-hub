"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/components/context/UserContext";
import Link from "next/link";

interface ProductData {
  name: string;
  vendorCode: string;
  calculatedQuantity?: number;
  calculatedCost?: number;
}

interface LegalEntity {
  id: string;
  name: string;
  inn: string;
  isDefault?: boolean;
}

// Tier color definitions
const tierColors: Record<string, { primary: string; hover: string; focusBorder: string; focusRing: string }> = {
  TIER4: {
    primary: "from-indigo-500 to-blue-500",
    hover: "hover:from-indigo-600 hover:to-blue-600",
    focusBorder: "focus:border-indigo-300",
    focusRing: "focus:ring-indigo-300/20",
  },
  TIER3: {
    primary: "from-amber-400 to-amber-500",
    hover: "hover:from-amber-500 hover:to-amber-600",
    focusBorder: "focus:border-amber-300",
    focusRing: "focus:ring-amber-300/20",
  },
  TIER2: {
    primary: "from-slate-400 to-slate-500",
    hover: "hover:from-slate-500 hover:to-slate-600",
    focusBorder: "focus:border-slate-300",
    focusRing: "focus:ring-slate-300/20",
  },
  TIER1: {
    primary: "from-[#0A84FF] to-[#007AFF]",
    hover: "hover:from-[#0A84FF] hover:to-[#0a6cff]",
    focusBorder: "focus:border-blue-300",
    focusRing: "focus:ring-blue-300/20",
  },
  default: {
    primary: "from-[#0A84FF] to-[#007AFF]",
    hover: "hover:from-[#0A84FF] hover:to-[#0a6cff]",
    focusBorder: "focus:border-blue-300",
    focusRing: "focus:ring-blue-300/20",
  },
};

interface OrderFormProps {
  product: ProductData;
}

export default function OrderForm({ product }: OrderFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    userName: "",
    userEmail: "",
    phoneNumber: "",
    city: "",
    retailPoint: "",
    legalEntityId: "",
    quantity: 1,
    comment: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, effectiveTier } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !user) return;
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fill form with user data
        setFormData((prev) => ({
          ...prev,
          userName: user?.displayName || user?.fullName || "",
          userEmail: user?.email || "",
          phoneNumber: user?.phone || "",
          city: user?.city || "",
          retailPoint: user?.retailPoint || "",
          quantity: product.calculatedQuantity || 1,
        }));

        // Load legal entities
        const response = await fetch("/api/legal-entities");
        if (response.ok) {
          const entities = await response.json();
          setLegalEntities(entities);

          // Set default entity
          if (entities.length > 0) {
            const defaultEntity = entities.find((e: LegalEntity) => e.isDefault);
            setFormData((prev) => ({
              ...prev,
              legalEntityId: defaultEntity?.id || entities[0].id,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [isOpen, user, product.calculatedQuantity]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, legalEntityId: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const selectedEntity = legalEntities.find(
        (le) => le.id === formData.legalEntityId
      );

      const orderData = {
        orderNumber: `ORD-${Date.now()}`,
        articleCode: product.vendorCode,
        productName: product.name,
        userName: formData.userName,
        userEmail: formData.userEmail,
        phoneNumber: formData.phoneNumber,
        city: formData.city,
        retailPoint: formData.retailPoint,
        legalEntityId: formData.legalEntityId,
        legalEntityName: selectedEntity?.name || "Не указано",
        quantity: parseInt(String(formData.quantity), 10),
        totalCost: product.calculatedCost || 0,
        comment: formData.comment,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        toast({
          title: "Заказ успешно создан!",
          description: `Номер вашего заказа: ${orderData.orderNumber}`,
        });
        setIsOpen(false);
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Failed to create order", error);
      toast({
        title: "Ошибка создания заказа",
        description: "Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentTierStyle = tierColors[effectiveTier || "default"] || tierColors.default;
  const isSubmitDisabled =
    isSaving || (!formData.legalEntityId && legalEntities.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={`w-full bg-gradient-to-r ${currentTierStyle.primary} ${currentTierStyle.hover} text-white shadow-lg`}
        >
          Заказать
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Оформление заказа</DialogTitle>
          <DialogDescription>
            {product.name} (Артикул: {product.vendorCode})
            {product.calculatedQuantity && (
              <span className="block text-sm text-green-600 mt-1">
                Рассчитанное количество: {product.calculatedQuantity} упаковок
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userName">Имя</Label>
              <Input
                id="userName"
                value={formData.userName}
                onChange={handleChange}
                required
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
              />
            </div>
            <div>
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                value={formData.userEmail}
                onChange={handleChange}
                required
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Номер телефона</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
              />
            </div>
            <div>
              <Label htmlFor="city">Город</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={handleChange}
                required
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="retailPoint">Торговая точка</Label>
              <Input
                id="retailPoint"
                value={formData.retailPoint}
                onChange={handleChange}
                required
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
              />
            </div>

            {/* Legal Entity Selection */}
            <div className="md:col-span-2">
              <Label htmlFor="legalEntityId">Юр. лицо</Label>
              {loading ? (
                <div className="h-10 w-full bg-slate-200 animate-pulse rounded-md" />
              ) : legalEntities.length > 0 ? (
                <Select
                  value={formData.legalEntityId}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger
                    className={`w-full ${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
                  >
                    <SelectValue placeholder="Выберите юр. лицо..." />
                  </SelectTrigger>
                  <SelectContent>
                    {legalEntities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name} (ИНН: {entity.inn}){" "}
                        {entity.isDefault ? "(По умолчанию)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert
                  variant="default"
                  className="bg-amber-50 border-amber-200"
                >
                  <PlusCircle className="h-4 w-4 text-amber-700" />
                  <AlertDescription className="text-amber-800">
                    Юр. лица не найдены. Пожалуйста,{" "}
                    <Link
                      href="/account/legal"
                      className="font-bold underline hover:text-amber-900"
                      onClick={() => setIsOpen(false)}
                    >
                      добавьте их в профиле
                    </Link>
                    , чтобы продолжить.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Количество упаковок</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                required
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
                placeholder={
                  product.calculatedQuantity
                    ? `Рекомендуется: ${product.calculatedQuantity}`
                    : "Введите количество"
                }
              />
              {product.calculatedQuantity && (
                <p className="text-xs text-slate-600 mt-1">
                  Автоматически рассчитано на основе калькулятора
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="comment">Комментарий для менеджера</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={handleChange}
              className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className={`w-full bg-gradient-to-r ${currentTierStyle.primary} ${currentTierStyle.hover} text-white rounded-xl shadow-lg`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Отправка...
                </>
              ) : (
                "Заказать"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
