import React, { useState, useEffect } from 'react';
import { LegalEntity } from '@/entities/LegalEntity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

export default function LegalEntityForm({ entity, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    kpp: '',
    legal_address: '',
    postal_address: '',
    is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (entity) {
      setFormData({
        name: entity.name || '',
        inn: entity.inn || '',
        kpp: entity.kpp || '',
        legal_address: entity.legal_address || '',
        postal_address: entity.postal_address || '',
        is_default: entity.is_default || false,
      });
    }
  }, [entity]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleCheckboxChange = (checked) => {
    setFormData(prev => ({ ...prev, is_default: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (entity) {
        await LegalEntity.update(entity.id, formData);
      } else {
        await LegalEntity.create(formData);
      }
      toast({ title: "Успех!", description: "Юр. лицо сохранено." });
      onSuccess();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить юр. лицо.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg bg-slate-50/50">
      <h3 className="text-lg font-semibold">{entity ? 'Редактирование' : 'Добавление'} юр. лица</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Название организации *</Label>
          <Input id="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="inn">ИНН *</Label>
          <Input id="inn" value={formData.inn} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="kpp">КПП</Label>
          <Input id="kpp" value={formData.kpp} onChange={handleChange} />
        </div>
        <div>
          <Label htmlFor="legal_address">Юридический адрес</Label>
          <Input id="legal_address" value={formData.legal_address} onChange={handleChange} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="postal_address">Почтовый адрес</Label>
          <Input id="postal_address" value={formData.postal_address} onChange={handleChange} />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="is_default" checked={formData.is_default} onCheckedChange={handleCheckboxChange} />
        <Label htmlFor="is_default">Использовать по умолчанию</Label>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
      </div>
    </form>
  );
}