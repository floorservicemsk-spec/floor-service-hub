import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { LegalEntity } from '@/entities/LegalEntity';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Building } from 'lucide-react';
import LegalEntityForm from '../profile/LegalEntityForm';

export default function UserEditDialog({ user, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    city: '',
    retail_point: '',
    personal_discount: 0,
    role: 'user',
    user_type: 'client'
  });
  const [legalEntities, setLegalEntities] = useState([]);
  const [showLegalEntityForm, setShowLegalEntityForm] = useState(false);
  const [editingLegalEntity, setEditingLegalEntity] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        city: user.city || '',
        retail_point: user.retail_point || '',
        personal_discount: user.personal_discount || 0,
        role: user.role || 'user',
        user_type: user.user_type || 'client'
      });
      loadLegalEntities();
    }
  }, [user]);

  const loadLegalEntities = async () => {
    try {
      const entities = await LegalEntity.filter({ created_by: user.email });
      setLegalEntities(entities);
    } catch (error) {
      console.error("Ошибка загрузки юр. лиц:", error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await User.update(user.id, formData);
      toast({
        title: "Успех!",
        description: "Данные пользователя обновлены.",
      });
      onSave();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные пользователя.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLegalEntitySave = async (entityData) => {
    try {
      const dataWithUser = { ...entityData, created_by: user.email };
      if (editingLegalEntity) {
        await LegalEntity.update(editingLegalEntity.id, dataWithUser);
      } else {
        await LegalEntity.create(dataWithUser);
      }
      setShowLegalEntityForm(false);
      setEditingLegalEntity(null);
      await loadLegalEntities();
      toast({
        title: "Успех!",
        description: editingLegalEntity ? "Юр. лицо обновлено." : "Юр. лицо добавлено.",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить юр. лицо.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLegalEntity = async (entityId) => {
    if (window.confirm("Вы уверены, что хотите удалить это юр. лицо?")) {
      try {
        await LegalEntity.delete(entityId);
        await loadLegalEntities();
        toast({
          title: "Успех!",
          description: "Юр. лицо удалено.",
        });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось удалить юр. лицо.",
          variant: "destructive",
        });
      }
    }
  };

  const getUserTypeLabel = (userType) => {
    switch(userType) {
      case 'client': return 'Клиент';
      case 'dealer': return 'Дилер';
      case 'manager': return 'Менеджер';
      default: return 'Клиент';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование пользователя</DialogTitle>
          <DialogDescription>
            Редактируйте данные пользователя {user?.full_name} ({user?.email})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Личные данные</TabsTrigger>
            <TabsTrigger value="legal-entities">
              <Building className="w-4 h-4 mr-2" />
              Юр. лица ({legalEntities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Полное имя</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email (нередактируемый)</Label>
                <Input id="email" value={user?.email || ''} disabled />
              </div>
              <div>
                <Label htmlFor="phone_number">Телефон</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">Город</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="retail_point">Торговая точка</Label>
                <Input
                  id="retail_point"
                  value={formData.retail_point}
                  onChange={(e) => handleChange('retail_point', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="personal_discount">Персональная скидка (%)</Label>
                <Input
                  id="personal_discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.personal_discount}
                  onChange={(e) => handleChange('personal_discount', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="role">Системная роль</Label>
                <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="user_type">Тип пользователя</Label>
                <Select value={formData.user_type} onValueChange={(value) => handleChange('user_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Клиент</SelectItem>
                    <SelectItem value="dealer">Дилер</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="legal-entities" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Юридические лица пользователя</h3>
              <Button onClick={() => setShowLegalEntityForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить юр. лицо
              </Button>
            </div>

            {showLegalEntityForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingLegalEntity ? 'Редактирование' : 'Добавление'} юр. лица</CardTitle>
                </CardHeader>
                <CardContent>
                  <LegalEntityForm
                    entity={editingLegalEntity}
                    onSave={handleLegalEntitySave}
                    onCancel={() => {
                      setShowLegalEntityForm(false);
                      setEditingLegalEntity(null);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {legalEntities.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>ИНН</TableHead>
                      <TableHead>КПП</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legalEntities.map(entity => (
                      <TableRow key={entity.id}>
                        <TableCell className="font-medium">{entity.name}</TableCell>
                        <TableCell>{entity.inn}</TableCell>
                        <TableCell>{entity.kpp || 'Не указан'}</TableCell>
                        <TableCell>
                          {entity.is_default && (
                            <Badge className="bg-green-100 text-green-800">По умолчанию</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingLegalEntity(entity);
                                setShowLegalEntityForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLegalEntity(entity.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                У пользователя нет добавленных юридических лиц
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}