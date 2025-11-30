import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FAQList({ items, categories, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[300px]" />
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
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">FAQ пуст</h3>
        <p className="text-slate-500">Добавьте первый вопрос в FAQ</p>
      </div>
    );
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Вопрос</TableHead>
            <TableHead>Категории</TableHead>
            <TableHead>Порядок</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id} className="hover:bg-slate-50">
              <TableCell>
                <div>
                  <div className="font-medium text-slate-900 line-clamp-2">
                    {item.question}
                  </div>
                  <div className="text-sm text-slate-500 line-clamp-2 mt-1">
                    {item.answer}
                  </div>
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.keywords.slice(0, 3).map(keyword => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {item.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.categories?.slice(0, 2).map(catId => (
                    <Badge key={catId} variant="secondary" className="text-xs">
                      {getCategoryName(catId)}
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
                <Badge variant="outline">{item.order || 0}</Badge>
              </TableCell>
              <TableCell>
                {item.is_published ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1"/>
                    Опубликован
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="w-3 h-3 mr-1"/>
                    Черновик
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
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