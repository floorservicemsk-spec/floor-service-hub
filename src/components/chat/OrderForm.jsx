
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Order } from "@/entities/Order";
import { LegalEntity } from "@/entities/LegalEntity"; // Импорт сущности юр. лица
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Импорт Select
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Tier color definitions
// These Tailwind CSS classes will be applied dynamically based on user's tier
const tierColors = {
  'gold': {
    primary: 'from-amber-500 to-amber-600',
    hover: 'hover:from-amber-600 hover:to-amber-700',
    focusBorder: 'focus:border-amber-300',
    focusRing: 'focus:ring-amber-300/20'
  },
  'silver': {
    primary: 'from-slate-400 to-slate-500',
    hover: 'hover:from-slate-500 hover:to-slate-600',
    focusBorder: 'focus:border-slate-300',
    focusRing: 'focus:ring-slate-300/20'
  },
  'bronze': {
    primary: 'from-orange-700 to-orange-800',
    hover: 'hover:from-orange-800 hover:to-orange-900',
    focusBorder: 'focus:border-orange-300',
    focusRing: 'focus:ring-orange-300/20'
  },
  // Default tier uses the existing blue
  'default': {
    primary: 'from-[#0A84FF] to-[#007AFF]',
    hover: 'hover:from-[#0A84FF] hover:to-[#0a6cff]',
    focusBorder: 'focus:border-blue-300',
    focusRing: 'focus:ring-blue-300/20'
  }
};

const initialFormData = {
  user_name: "",
  user_email: "",
  phone_number: "",
  city: "",
  retail_point: "",
  legal_entity_id: "", // Заменено с legal_entity
  quantity: 1,
  comment: "",
};

export default function OrderForm({ product }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [legalEntities, setLegalEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserTier, setCurrentUserTier] = useState('default'); // State for user tier
  const { toast } = useToast();

  useEffect(() => {
    // Only load data when the dialog opens
    if (isOpen) {
      setLoading(true);
      const loadInitialData = async () => {
        try {
          const currentUser = await User.me(); // Загружаем текущего пользователя
          setCurrentUserTier(currentUser.tier || 'default'); // Set user tier for dynamic styling
          
          // Заполняем поля формы данными пользователя
          setFormData(prev => ({
            ...prev,
            user_name: currentUser.full_name || "",
            user_email: currentUser.email || "",
            phone_number: currentUser.phone_number || "",
            city: currentUser.city || "",
            retail_point: currentUser.retail_point || "",
            quantity: product.calculatedQuantity || 1, // Подставляем рассчитанное количество
          }));
          
          // Загружаем юр. лица, привязанные к текущему пользователю (по email)
          const userLegalEntities = await LegalEntity.filter({ created_by: currentUser.email });
          setLegalEntities(userLegalEntities);

          // Определяем юр. лицо по умолчанию: сначала ищем помеченное как is_default,
          // если нет — выбираем первое из списка, иначе оставляем пустым
          let defaultLegalEntityId = "";
          if (userLegalEntities.length > 0) {
            const defaultEntity = userLegalEntities.find(entity => entity.is_default);
            if (defaultEntity) {
              defaultLegalEntityId = defaultEntity.id;
            } else {
              // Если нет помеченного по умолчанию, выбираем первое в списке
              defaultLegalEntityId = userLegalEntities[0].id;
            }
          }
          
          setFormData(prev => ({
            ...prev,
            legal_entity_id: defaultLegalEntityId,
          }));

        } catch (error) {
          console.error("Failed to load user data or legal entities:", error);
           setFormData(prev => ({
            ...prev,
            quantity: product.calculatedQuantity || 1, // Подставляем рассчитанное количество даже при ошибке
          }));
        } finally {
            setLoading(false);
        }
      };
      loadInitialData();
    }
  }, [isOpen, product.calculatedQuantity]); // Добавляем calculatedQuantity в зависимости

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, legal_entity_id: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const selectedEntity = legalEntities.find(le => le.id === formData.legal_entity_id);
      
      const orderData = {
        order_number: `ORD-${Date.now()}`,
        article_code: product.vendorCode,
        product_name: product.name,
        user_name: formData.user_name,
        user_email: formData.user_email,
        phone_number: formData.phone_number,
        city: formData.city,
        retail_point: formData.retail_point,
        legal_entity_id: formData.legal_entity_id,
        legal_entity_name: selectedEntity ? selectedEntity.name : "Не указано",
        quantity: parseInt(formData.quantity, 10),
        total_cost: product.calculatedCost || 0,
        comment: formData.comment,
      };

      // Сохраняем: данные заказа и обновленные данные пользователя
      // The user's full_name is now updated via updateMyUserData for consistency
      const updates = [
        Order.create(orderData),
        User.updateMyUserData({
          full_name: formData.user_name, // Ensure full_name is updated here
          phone_number: formData.phone_number,
          city: formData.city,
          retail_point: formData.retail_point
        })
      ];
      await Promise.all(updates);

      // Оповестим всё приложение
      window.dispatchEvent(new CustomEvent('user-updated'));

      toast({
        title: "Заказ успешно создан!",
        description: `Номер вашего заказа: ${orderData.order_number}`,
        variant: "success",
      });
      setIsOpen(false);
      setFormData(initialFormData); // Reset form completely

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

  // Determine current tier styles
  const currentTierStyle = tierColors[currentUserTier] || tierColors.default;

  const isSubmitDisabled = isSaving || (!formData.legal_entity_id && legalEntities.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={`w-full bg-gradient-to-r ${currentTierStyle.primary} ${currentTierStyle.hover} text-white shadow-lg`}>
          Заказать
        </Button>
      </DialogTrigger>
      {/* add no-red-focus class to neutralize red borders inside dialog */}
      <DialogContent className="sm:max-w-[600px] no-red-focus">
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
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_name">Имя</Label>
              <Input id="user_name" name="user_name" value={formData.user_name} onChange={handleChange} required className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} />
            </div>
            <div>
              <Label htmlFor="user_email">Email</Label>
              <Input id="user_email" name="user_email" type="email" value={formData.user_email} onChange={handleChange} required className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} />
            </div>
            <div>
              <Label htmlFor="phone_number">Номер телефона</Label>
              <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} />
            </div>
            <div>
              <Label htmlFor="city">Город</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleChange} required className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} />
            </div>
             <div className="md:col-span-2">
              <Label htmlFor="retail_point">Торговая точка</Label>
              <Input id="retail_point" name="retail_point" value={formData.retail_point} onChange={handleChange} required className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} />
            </div>
            
            {/* Поле выбора юр. лица */}
            <div className="md:col-span-2">
                <Label htmlFor="legal_entity_id">Юр. лицо</Label>
                {loading ? (
                    <div className="h-10 w-full bg-slate-200 animate-pulse rounded-md"></div>
                ) : legalEntities.length > 0 ? (
                    <Select value={formData.legal_entity_id} onValueChange={handleSelectChange}>
                        <SelectTrigger className={`w-full ${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`}>
                            <SelectValue placeholder="Выберите юр. лицо..." />
                        </SelectTrigger>
                        <SelectContent>
                            {legalEntities.map(entity => (
                                <SelectItem key={entity.id} value={entity.id}>
                                    {entity.name} (ИНН: {entity.inn}) {entity.is_default ? '(По умолчанию)' : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Alert variant="default" className="bg-amber-50 border-amber-200">
                        <PlusCircle className="h-4 w-4 text-amber-700" />
                        <AlertDescription className="text-amber-800">
                            Юр. лица не найдены. Пожалуйста,{" "}
                            <Link to={createPageUrl("Profile")} className="font-bold underline hover:text-amber-900" onClick={() => setIsOpen(false)}>
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
                name="quantity" 
                type="number" 
                min="1" 
                value={formData.quantity} 
                onChange={handleChange} 
                required 
                className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} 
                placeholder={product.calculatedQuantity ? `Рекомендуется: ${product.calculatedQuantity}` : "Введите количество"}
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
            <Textarea id="comment" name="comment" value={formData.comment} onChange={handleChange} className={`${currentTierStyle.focusBorder} ${currentTierStyle.focusRing}`} />
          </div>
        
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isSubmitDisabled} 
              className={`w-full bg-gradient-to-r ${currentTierStyle.primary} ${currentTierStyle.hover} text-white rounded-xl shadow-lg`}
            >
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Отправка...</> : 'Заказать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
