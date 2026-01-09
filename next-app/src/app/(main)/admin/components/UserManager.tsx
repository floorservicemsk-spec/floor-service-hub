"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/components/context/UserContext";

interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  fullName?: string;
  phone?: string;
  city?: string;
  retailPoint?: string;
  role: string;
  userType: string;
  isApproved: boolean;
  isBlocked: boolean;
  approvalRequestedAt?: string;
  createdAt: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleToggleBlock = async (user: AdminUser) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isBlocked: !user.isBlocked }),
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u
          )
        );
        toast({
          title: "Успех",
          description: user.isBlocked
            ? "Пользователь разблокирован"
            : "Пользователь заблокирован",
        });
      }
    } catch (error) {
      console.error("Error toggling block:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус",
        variant: "destructive",
      });
    }
  };

  const handleToggleApproval = async (user: AdminUser) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isApproved: !user.isApproved }),
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, isApproved: !u.isApproved } : u
          )
        );
        toast({
          title: "Успех",
          description: user.isApproved
            ? "Одобрение снято"
            : "Пользователь одобрен",
        });
      }
    } catch (error) {
      console.error("Error toggling approval:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус",
        variant: "destructive",
      });
    }
  };

  const pendingUsers = filteredUsers.filter(
    (u) => !u.isApproved && u.role !== "ADMIN"
  );
  const approvedUsers = filteredUsers.filter(
    (u) => u.isApproved || u.role === "ADMIN"
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
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
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">
                          {user.displayName || user.fullName || user.email}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.approvalRequestedAt
                            ? new Date(
                                user.approvalRequestedAt
                              ).toLocaleDateString("ru-RU")
                            : new Date(user.createdAt).toLocaleDateString(
                                "ru-RU"
                              )}
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
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Все пользователи ({approvedUsers.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
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
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Заблокирован</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-6 w-10 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  approvedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">
                          {user.displayName || user.fullName || user.email}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                        {user.city && (
                          <div className="text-xs text-slate-400">{user.city}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "ADMIN" ? "default" : "outline"}
                          className={
                            user.role === "ADMIN"
                              ? "bg-indigo-600 text-white"
                              : ""
                          }
                        >
                          {user.role === "ADMIN" ? "Администратор" : "Пользователь"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.userType === "DEALER"
                            ? "Дилер"
                            : user.userType === "CLIENT"
                            ? "Клиент"
                            : user.userType === "MANAGER"
                            ? "Менеджер"
                            : user.userType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
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
                            checked={!!user.isBlocked}
                            onCheckedChange={() => handleToggleBlock(user)}
                            aria-label={`Заблокировать пользователя ${user.displayName || user.fullName}`}
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
