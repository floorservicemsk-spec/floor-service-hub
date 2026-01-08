"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/components/context/UserContext";
import { api } from "@/lib/api";
import { ShoppingCart, Package, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber?: string;
  status: string;
  totalCost: number;
  createdAt: string;
  items?: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export default function AccountOrdersPage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent">
            История заказов
          </h1>
          <p className="text-slate-600 mt-1">Просмотр всех ваших заказов</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-white/60 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg"
              >
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full p-6 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">
                              Заказ #{order.orderNumber || order.id.slice(0, 8)}
                            </h3>
                            <Badge
                              variant="outline"
                              className={statusColors[order.status] || statusColors.pending}
                            >
                              {statusLabels[order.status] || order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(order.createdAt), "d MMMM yyyy", {
                                locale: ru,
                              })}
                            </span>
                            <span className="font-semibold text-[#007AFF]">
                              {order.totalCost.toLocaleString("ru-RU")} ₽
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          expandedOrder === order.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {expandedOrder === order.id && order.items && (
                    <div className="px-6 pb-6 pt-0 border-t border-slate-100">
                      <div className="space-y-3 mt-4">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-700">
                                {item.productName}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600">
                              {item.quantity} × {item.price.toLocaleString("ru-RU")} ₽
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-12">
            <CardContent>
              <ShoppingCart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                Нет заказов
              </h3>
              <p className="text-slate-600">
                У вас пока нет оформленных заказов
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
