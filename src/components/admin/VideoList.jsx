import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CheckCircle, XCircle, Youtube, PlayCircle, Video as VideoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PlatformIcon = ({ platform }) => {
  switch (platform) {
    case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
    case 'rutube': return <PlayCircle className="w-4 h-4 text-blue-600" />;
    case 'vk': return <VideoIcon className="w-4 h-4 text-sky-500" />;
    default: return <PlayCircle className="w-4 h-4 text-slate-500" />;
  }
};

export default function VideoList({ items, categories, loading, onEdit, onDelete }) {
  const getCategoryNames = (categoryIds) => {
    if (!categoryIds || !categories) return [];
    return categoryIds.map(id => categories.find(cat => cat.id === id)?.name).filter(Boolean);
  };

  if (loading) {
    return Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-2" />);
  }

  if (items.length === 0) {
    return <p className="text-center text-slate-500 py-8">Видео еще не добавлены.</p>;
  }
  
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Table>
        <TableHeader><TableRow className="bg-slate-50">
          <TableHead>Видео</TableHead>
          <TableHead>Категории</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={item.platform} />
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      {item.url}
                    </a>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {getCategoryNames(item.categories).map(name => (
                    <Badge key={name} variant="secondary">{name}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {item.is_published ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/>Опубликовано</Badge>
                ) : (
                  <Badge variant="outline"><XCircle className="w-3 h-3 mr-1"/>Скрыто</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}