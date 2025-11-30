
import React, { useState, useEffect } from 'react';
import { LegalEntity } from '@/entities/LegalEntity';
import { User } from '@/entities/User';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import LegalEntityForm from './LegalEntityForm';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function LegalEntityManager() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    setLoading(true);
    try {
      const currentUser = await User.me();
      const data = await LegalEntity.filter({ created_by: currentUser.email }, "-created_date");
      setEntities(data);
    } catch (error) {
      console.error("Failed to load legal entities for current user", error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Вы уверены, что хотите удалить это юр. лицо?")) {
      await LegalEntity.delete(id);
      loadEntities();
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingEntity(null); // Clear editing entity after successful submission
    loadEntities();
  };

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle>Управление юридическими лицами</CardTitle>
          <CardDescription>Добавляйте и редактируйте ваши организации.</CardDescription>
        </div>
        <Button onClick={() => { setEditingEntity(null); setShowForm(true); }} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="md:hidden">Добавить</span>
          <span className="hidden md:inline">Добавить юр. лицо</span>
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6">
            <LegalEntityForm
              entity={editingEntity}
              onSuccess={handleFormSubmit}
              onCancel={() => { setShowForm(false); setEditingEntity(null); }}
            />
          </div>
        )}

        {/* Таблица для больших экранов */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>ИНН</TableHead>
                <TableHead>По умолчанию</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!loading && entities.map(entity => (
                <TableRow key={entity.id}>
                  <TableCell className="font-medium">{entity.name}</TableCell>
                  <TableCell>{entity.inn}</TableCell>
                  <TableCell>
                    {entity.is_default && <Badge>Да</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entity)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entity.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Карточки для мобильных экранов */}
        <div className="md:hidden space-y-4">
          {loading && Array.from({ length: 2 }).map((_, i) => (
             <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full mt-2" />
             </Card>
          ))}
          {!loading && entities.map(entity => (
            <Card key={entity.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-800">{entity.name}</h3>
                  <p className="text-sm text-slate-500">ИНН: {entity.inn}</p>
                </div>
                {entity.is_default && <Badge>По умолчанию</Badge>}
              </div>
              <div className="border-t mt-3 pt-3 flex gap-2">
                 <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(entity)}>
                    <Edit className="w-4 h-4 mr-2" /> Редактировать
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(entity.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {!loading && entities.length === 0 && !showForm && (
          <div className="text-center py-10 text-slate-500">
            <p>У вас еще нет добавленных юридических лиц.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
