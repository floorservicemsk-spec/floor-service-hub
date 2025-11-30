
import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import UserEditDialog from "./UserEditDialog";

export default function UserDataManager() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const allUsers = await User.list("-created_date");
      setUsers(allUsers);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // NEW: auto-refresh when profile is updated anywhere
  useEffect(() => {
    const handler = () => loadUsers();
    window.addEventListener('user-updated', handler);
    return () => window.removeEventListener('user-updated', handler);
  }, [loadUsers]);

  useEffect(() => {
    let filtered = users;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = users.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        // Ensure search also considers the 'user_type' if 'role' is not 'admin'
        user.role?.toLowerCase().includes(query) || 
        user.user_type?.toLowerCase().includes(query)
      );
    }
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
  };
  
  const handleSaveUser = () => {
    setEditingUser(null);
    loadUsers(); // Refresh the list after saving
  };

  const getRoleBadge = (user) => {
    // Сначала проверяем роль администратора
    if (user.role === 'admin') {
      return <Badge className="bg-indigo-600 text-white">Администратор</Badge>;
    }
    
    // Затем смотрим на тип пользователя
    switch(user.user_type) {
        case 'manager': return <Badge className="bg-sky-600 text-white">Менеджер</Badge>;
        case 'dealer': return <Badge className="bg-amber-600 text-white">Дилер</Badge>;
        case 'client':
        default:
          return <Badge variant="outline">Клиент</Badge>;
    }
  }

  return (
    <div className="w-full">
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg lg:text-xl">Управление пользователями</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadUsers} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </CardHeader>
        <CardContent className="w-full">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Поиск по имени, email или роли..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          <div className="admin-table-container overflow-x-auto">
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Скидка</TableHead>
                    <TableHead>Город</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[150px]">
                            {user.display_name || user.full_name || user.email}
                          </div>
                          <div className="text-sm text-slate-500 truncate max-w-[150px]">{user.email}</div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user)}</TableCell>
                        <TableCell>{user.personal_discount || 0}%</TableCell>
                        <TableCell className="truncate max-w-[100px]">{user.city || 'Не указан'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {editingUser && (
        <UserEditDialog 
          user={editingUser}
          isOpen={!!editingUser}
          onClose={handleCloseDialog}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
