"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  Suspense,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, RotateCcw, Loader2, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/context/UserContext";
import { useProductData } from "@/components/context/ProductDataContext";
import { api, ChatMessage as ChatMessageType } from "@/lib/api";
import { generateSessionId } from "@/lib/utils";
import ChatMessage from "@/components/chat/ChatMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const { user, effectiveTier, bonusEnabled } = useUser();
  const { productIndex } = useProductData();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // --- Helpers ---
  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    return distanceFromBottom < 120;
  };

  const scrollToBottom = (smooth = true) => {
    const anchor = messagesEndRef.current;
    if (anchor) {
      anchor.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
    setShowScrollButton(false);
  };

  // --- Init ---
  useEffect(() => {
    initializeChat();
  }, []);

  useLayoutEffect(() => {
    if (isTyping || isNearBottom()) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToBottom(true))
      );
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      if (isNearBottom()) scrollToBottom(false);
    });
    resizeObserverRef.current.observe(container);

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user?.id]);

  const handleScroll = () => {
    setShowScrollButton(!isNearBottom());
  };

  const initializeChat = async () => {
    if (!user) return;

    try {
      let currentSessionId = user.sessionId;
      if (!currentSessionId) {
        currentSessionId = generateSessionId();
        await api.updateUser({ sessionId: currentSessionId });
      }

      setSessionId(currentSessionId);
      await loadChatHistory(currentSessionId);
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const loadChatHistory = async (sid: string) => {
    try {
      const session = await api.getChatSession(sid);
      if (session && session.messages) {
        setMessages(session.messages as ChatMessageType[]);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const saveChatSession = async (updatedMessages: ChatMessageType[]) => {
    if (!sessionId || !user) return;

    try {
      await api.saveChatSession({
        sessionId,
        messages: updatedMessages,
        userEmail: user.email,
      });
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
      attachments: [],
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await api.sendChatMessage({
        message: inputMessage,
        sessionId,
        chatHistory: messages,
      });

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
        attachments: response.attachments || [],
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveChatSession(finalMessages);
    } catch (error) {
      console.error("Error getting response:", error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз.",
        timestamp: new Date().toISOString(),
        attachments: [],
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = async () => {
    setMessages([]);
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    if (user) {
      await api.updateUser({ sessionId: newSessionId });
    }
    requestAnimationFrame(() => scrollToBottom(false));
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
      {/* Header - Desktop only */}
      <div className="hidden md:block absolute top-0 left-0 right-0 z-20 bg-white/40 backdrop-blur-md border-b border-white/10 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent truncate">
                ИИ-Ассистент
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Задайте любой вопрос по нашей базе знаний
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="bg-white/60 border-slate-200/50 hover:bg-white/80 transition-all duration-200 flex-shrink-0 backdrop-blur-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Очистить чат
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-0 md:pt-28 p-6 pb-32 space-y-6"
      >
        <AnimatePresence>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              tier={effectiveTier}
              bonusEnabled={bonusEnabled}
            />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 right-6 z-20"
          >
            <Button
              size="icon"
              onClick={() => scrollToBottom(true)}
              className="rounded-full h-12 w-12 shadow-lg bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white"
              aria-label="Прокрутить вниз"
            >
              <ArrowDown className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-xl border-t border-white/20 p-4 md:pl-80">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите сообщение..."
                className="min-h-[52px] max-h-[150px] bg-white/80 border-slate-200 focus:border-[#007AFF] focus:ring-[#007AFF]/20 rounded-xl resize-none w-full"
                disabled={isTyping}
              />
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff] text-white rounded-xl px-5 h-[52px] transition-all duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center flex-shrink-0"
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
