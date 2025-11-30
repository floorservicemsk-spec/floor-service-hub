
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Copy, FileText, Link as LinkIcon, Database, Info, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AIDataList({ items, loading, syncingId, onEdit, onDelete, onClone, onSync }) {

  const getIconForType = (type) => {
    switch (type) {
      case 'link':
        return <LinkIcon className="w-3 h-3" />;
      case 'document':
        return <FileText className="w-3 h-3" />;
      case 'yandex_disk':
        return <Database className="w-3 h-3" />;
      case 'xml_feed':
        return <Database className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  const skeletons = Array(3).fill(0).map((_, i) => (
    <TableRow key={i}>
      <TableCell>
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[150px] mt-1" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[80px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-5 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-3 w-[80px] mt-1" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  ));

  if (loading) {
    return (
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Название</TableHead>
              <TableHead className="w-[100px]">Тип</TableHead>
              <TableHead className="w-[100px] text-center">Публичный</TableHead>
              <TableHead className="min-w-[150px]">Синхронизация</TableHead>
              <TableHead className="w-[120px] text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skeletons}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Нет источников данных</h3>
        <p className="text-slate-500">Добавьте первый источник знаний для ИИ</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Название</TableHead>
            <TableHead className="w-[100px]">Тип</TableHead>
            <TableHead className="w-[100px] text-center">Публичный</TableHead>
            <TableHead className="min-w-[150px]">Синхронизация</TableHead>
            <TableHead className="w-[120px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell className="max-w-[200px]">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-sm text-slate-500 truncate">
                  {item.description || item.url || 'Нет описания'}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1 whitespace-nowrap">
                  {getIconForType(item.type)}
                  <span className="text-xs">
                    {item.type === 'link' ? 'Ссылка' : 
                     item.type === 'document' ? 'Документ' : 
                     item.type === 'yandex_disk' ? 'Я.Диск' : 
                     item.type === 'xml_feed' ? 'XML' : item.type}
                  </span>
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {item.is_public ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400 mx-auto" />
                )}
              </TableCell>
              <TableCell>
                  {item.type === 'xml_feed' ? (
                      <div className="flex flex-col gap-1 items-start">
                          <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onSync(item)}
                              disabled={syncingId === item.id}
                              className="whitespace-nowrap text-xs"
                          >
                              <RefreshCw className={`w-3 h-3 mr-1 ${syncingId === item.id ? 'animate-spin' : ''}`} />
                              Синхронизировать
                          </Button>
                          {item.last_sync && (
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                  {formatDistanceToNow(new Date(item.last_sync), { addSuffix: true, locale: ru })}
                              </span>
                          )}
                          {item.xml_data?.products && (
                              <span className="text-xs text-green-600 whitespace-nowrap">
                                  📦 {item.xml_data.products.length} товаров
                              </span>
                          )}
                      </div>
                  ) : item.type === 'link' ? (
                      <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs text-amber-600 whitespace-nowrap">
                              ⚠️ Синхронизация скоро
                          </span>
                          {item.content && (
                              <span className="text-xs text-green-600 whitespace-nowrap">
                                  📄 {item.content.length} символов
                              </span>
                          )}
                      </div>
                  ) : (
                      <span className="text-slate-500 text-sm">-</span>
                  )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onClone(item)} className="h-8 w-8">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-600 h-8 w-8">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
