"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, RotateCcw, Loader2, ArrowDown, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/components/context/UserContext";
import { useProductData } from "@/components/context/ProductDataContext";
import { api, ChatMessage as ChatMessageType } from "@/lib/api";
import { generateSessionId } from "@/lib/utils";
import TypingIndicator from "@/components/chat/TypingIndicator";

// Dynamic import for heavy ChatMessage component (reduces initial bundle)
const ChatMessage = dynamic(() => import("@/components/chat/ChatMessage"), {
  loading: () => (
    <div className="animate-pulse bg-white/50 rounded-2xl h-20 w-full max-w-xl" />
  ),
  ssr: false,
});

// Memoized message list to prevent re-renders
const MemoizedMessageList = memo(function MessageList({
  messages,
  tier,
  bonusEnabled,
}: {
  messages: ChatMessageType[];
  tier: string | null;
  bonusEnabled: boolean;
}) {
  return (
    <>
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          tier={tier}
          bonusEnabled={bonusEnabled}
        />
      ))}
    </>
  );
});

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const { user, effectiveTier, bonusEnabled } = useUser();
  const { productIndex } = useProductData();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Helpers ---
  const isNearBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    return distanceFromBottom < 120;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const anchor = messagesEndRef.current;
    if (anchor) {
      anchor.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
    setShowScrollButton(false);
  }, []);

  // --- Init ---
  useEffect(() => {
    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (isTyping || isStreaming || isNearBottom()) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToBottom(true))
      );
    }
  }, [messages, isTyping, isStreaming, streamingContent, isNearBottom, scrollToBottom]);

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
  }, [isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (user) {
      initializeChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleScroll = useCallback(() => {
    setShowScrollButton(!isNearBottom());
  }, [isNearBottom]);

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

  // === STREAMING MESSAGE HANDLER ===
  const handleSendMessageWithStreaming = async () => {
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
    const currentInput = inputMessage;
    setInputMessage("");

    // First, try the regular chat API (handles products, downloads, etc.)
    setIsTyping(true);

    try {
      const response = await api.sendChatMessage({
        message: currentInput,
        sessionId,
        chatHistory: messages,
      });

      // If we got a product_info or download response, use it directly
      try {
        const parsed = JSON.parse(response.content);
        if (
          parsed.type === "product_info" ||
          parsed.type === "download_link" ||
          parsed.type === "multi_download_links"
        ) {
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
          setIsTyping(false);
          return;
        }
      } catch {
        // Not JSON, continue
      }

      // For text responses, use streaming for better UX
      setIsTyping(false);
      setIsStreaming(true);
      setStreamingContent("");

      // Abort any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const streamResponse = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          chatHistory: messages.slice(-5),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!streamResponse.ok) {
        throw new Error("Stream failed");
      }

      const reader = streamResponse.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add final message
      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent || response.content,
        timestamp: new Date().toISOString(),
        attachments: [],
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setStreamingContent("");
      await saveChatSession(finalMessages);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Stream was stopped
        if (streamingContent) {
          const assistantMessage: ChatMessageType = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: streamingContent,
            timestamp: new Date().toISOString(),
            attachments: [],
          };
          const finalMessages = [...updatedMessages, assistantMessage];
          setMessages(finalMessages);
          await saveChatSession(finalMessages);
        }
      } else {
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
      }
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageWithStreaming();
    }
  };

  const clearChat = async () => {
    setMessages([]);
    setStreamingContent("");
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
          <MemoizedMessageList
            messages={messages}
            tier={effectiveTier}
            bonusEnabled={bonusEnabled}
          />
        </AnimatePresence>

        {/* Streaming message preview */}
        {isStreaming && streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-white/80 border border-white/50 flex items-center justify-center flex-shrink-0 mt-2">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
            <div className="flex-1 max-w-3xl">
              <div className="bg-white rounded-2xl px-5 py-3 border border-white/60 shadow-sm">
                <div className="prose prose-sm max-w-none prose-slate">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isTyping && !isStreaming && <TypingIndicator />}
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
                disabled={isTyping || isStreaming}
              />
            </div>

            {isStreaming ? (
              <Button
                onClick={stopStreaming}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-5 h-[52px] transition-all duration-300 shadow-lg flex items-center justify-center flex-shrink-0"
              >
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSendMessageWithStreaming}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:from-[#0A84FF] hover:to-[#0a6cff] text-white rounded-xl px-5 h-[52px] transition-all duration-300 shadow-lg disabled:opacity-50 flex items-center justify-center flex-shrink-0"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
