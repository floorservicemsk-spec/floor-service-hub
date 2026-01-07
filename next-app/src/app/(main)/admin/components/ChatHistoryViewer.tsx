"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { User, Bot, MessageSquare, RefreshCw } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: unknown[];
}

interface ChatSession {
  id: string;
  sessionId: string;
  userEmail?: string;
  messages: ChatMessage[];
  lastActivity: string;
  isActive: boolean;
}

export default function ChatHistoryViewer() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/chat-history");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Загрузка истории чатов...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-white/20 shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          История чатов
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSessions}
          className="w-full sm:w-auto"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Обновить
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              История пуста
            </h3>
            <p className="text-slate-500">
              Чаты пользователей будут отображаться здесь
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {sessions.map((session) => (
              <AccordionItem value={session.id} key={session.id}>
                <AccordionTrigger className="hover:no-underline text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#C31E2E] to-[#940815] rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">
                          {session.userEmail || "Аноним"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {(session.messages as ChatMessage[])?.length || 0}{" "}
                          сообщений
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:text-right flex-shrink-0">
                      <p className="text-sm text-slate-600">
                        {format(new Date(session.lastActivity), "d MMM yyyy", {
                          locale: ru,
                        })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(session.lastActivity), "HH:mm", {
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 p-4 border-t bg-slate-50/50 rounded-lg">
                    {(session.messages as ChatMessage[])?.length > 0 ? (
                      (session.messages as ChatMessage[]).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-red-50 border-l-4 border-red-500"
                              : "bg-white border-l-4 border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {msg.role === "user" ? (
                              <User className="w-4 h-4 text-red-600" />
                            ) : (
                              <Bot className="w-4 h-4 text-slate-600" />
                            )}
                            <Badge
                              variant={
                                msg.role === "user" ? "default" : "secondary"
                              }
                              className={
                                msg.role === "user"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : ""
                              }
                            >
                              {msg.role === "user" ? "Пользователь" : "ИИ"}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {format(new Date(msg.timestamp), "HH:mm", {
                                locale: ru,
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.content}
                          </p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              📎 {msg.attachments.length} файл(ов) прикреплено
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-500 py-4">
                        Сообщений в этой сессии нет
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
