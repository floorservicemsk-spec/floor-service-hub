
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle, XCircle, FileText, ExternalLink, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgeList({ items, loading, onEdit, onDelete, onClone }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">База знаний пуста</h3>
        <p className="text-slate-500">Добавьте первый элемент в базу знаний</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Название</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Категории</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id} className="hover:bg-slate-50">
              <TableCell>
                <div>
                  <div className="font-medium text-slate-900">{item.title}</div>
                  {item.description && (
                    <div className="text-sm text-slate-500 truncate max-w-xs">
                      {item.description}
                    </div>
                  )}
                  {item.article_code && (
                    <Badge variant="outline" className="mt-1">
                      {item.article_code}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  {item.type === 'link' && <ExternalLink className="w-3 h-3" />}
                  {item.type === 'document' && <FileText className="w-3 h-3" />}
                  {item.type === 'link' ? 'Ссылка' : 
                   item.type === 'document' ? 'Документ' : 'Я.Диск'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.categories?.slice(0, 2).map(cat => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                  {item.categories?.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.categories.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {item.is_public ? (
                    <Badge className="bg-green-100 text-green-800 w-fit text-xs">
                      <CheckCircle className="w-3 h-3 mr-1"/>
                      Публичный
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="w-fit text-xs">
                      <XCircle className="w-3 h-3 mr-1"/>
                      Скрытый
                    </Badge>
                  )}
                  {item.is_ai_source && (
                    <Badge className="bg-blue-100 text-blue-800 w-fit text-xs">
                      <CheckCircle className="w-3 h-3 mr-1"/>
                      Источник ИИ
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onClone(item)}
                    className="hover:bg-yellow-50 hover:text-yellow-700 w-8 h-8"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(item)}
                    className="hover:bg-blue-50 hover:text-blue-600 w-8 h-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(item.id)} 
                    className="hover:bg-red-50 hover:text-red-600 w-8 h-8"
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
  );
}
