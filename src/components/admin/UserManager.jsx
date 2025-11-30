import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, UserCheck, UserX, Shield, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, me] = await Promise.all([User.list("-created_date"), User.me()]);
      setUsers(allUsers);
      setCurrentUser(me);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleToggleBlock = async (userToToggle) => {
    const newStatus = !userToToggle.is_blocked;
    try {
      await User.update(userToToggle.id, { is_blocked: newStatus });
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userToToggle.id ? { ...u, is_blocked: newStatus } : u
        )
      );
    } catch (error) {
      console.error("Ошибка обновления статуса пользователя:", error);
      alert("Не удалось изменить статус пользователя.");
    }
  };

  const handleToggleApproval = async (userToToggle) => {
    const newStatus = !userToToggle.is_approved;
    try {
      await User.update(userToToggle.id, { is_approved: newStatus });
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userToToggle.id ? { ...u, is_approved: newStatus } : u
        )
      );
    } catch (error) {
      console.error("Ошибка одобрения пользователя:", error);
      alert("Не удалось изменить статус одобрения.");
    }
  };

  const pendingUsers = filteredUsers.filter(u => !u.is_approved && u.role !== 'admin');
  const approvedUsers = filteredUsers.filter(u => u.is_approved || u.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Поиск */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Поиск по имени, email или роли..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-slate-600">
              Найдено: {filteredUsers.length} из {users.length} пользователей
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Approval */}
      {pendingUsers.length > 0 && (
        <Card className="bg-amber-50/70 backdrop-blur-xl border-amber-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Clock className="w-5 h-5" />
              Ожидают одобрения ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead className="text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.approval_requested_at 
                            ? new Date(user.approval_requested_at).toLocaleDateString('ru-RU')
                            : new Date(user.created_date).toLocaleDateString('ru-RU')
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleToggleApproval(user)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleToggleBlock(user)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Все пользователи ({approvedUsers.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Заблокирован</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-10 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  approvedUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className={user.role === 'admin' ? 'bg-indigo-600 text-white' : ''}>
                          {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive">
                            <UserX className="w-3 h-3 mr-1" />
                            Заблокирован
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Активен
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {currentUser?.id === user.id ? (
                           <div className="flex items-center justify-end text-sm text-slate-500 gap-2">
                             <Shield className="w-4 h-4 text-indigo-500" />
                             Это вы
                           </div>
                        ) : (
                          <Switch
                            checked={!!user.is_blocked}
                            onCheckedChange={() => handleToggleBlock(user)}
                            aria-label={`Заблокировать пользователя ${user.full_name}`}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}