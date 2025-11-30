import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { ChatSession } from "@/entities/ChatSession";
import { User } from "@/entities/User";
import { KnowledgeBase } from "@/entities/KnowledgeBase";
import { AISettings } from "@/entities/AISettings";
import { InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, RotateCcw, Loader2, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { useProductData } from "@/components/context/ProductDataContext";

const ChatMessage = React.lazy(() => import("../components/chat/ChatMessage"));
const TypingIndicator = React.lazy(() => import("../components/chat/TypingIndicator"));

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState([]);
  const [aiSettings, setAiSettings] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const { user, dealerProfile, bonusEnabled, effectiveTier } = useUser();
  const { productIndex } = useProductData();

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const location = useLocation();

  // --- Helpers -------------------------------------------------------------
  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    return distanceFromBottom < 120; // пикселей до низа, чтобы считать, что "рядом с низом"
  };

  const scrollToBottom = (smooth = true) => {
    const container = chatContainerRef.current;
    const anchor = messagesEndRef.current;

    if (anchor) {
      // Используем anchor, чтобы корректно работать с ленивой загрузкой/изображениями
      anchor.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    } else if (container) {
      container.scrollTop = container.scrollHeight;
    }
    setShowScrollButton(false);
  };

  // --- Init ---------------------------------------------------------------
  useEffect(() => {
    initializeChat();
  }, []);

  // --- Keep at bottom when new messages arrive (only if user не прокрутил вверх) ---
  // useLayoutEffect: срабатывает после DOM-изменений, до покраски; скролл работает стабильнее
  useLayoutEffect(() => {
    if (isTyping || isNearBottom()) {
      // двойной rAF, чтобы дождаться отрисовки вложенных компонентов/изображений
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom(true)));
    }
  }, [messages, isTyping]);

  // --- Ensure scroll when navigating to Chat route ---
  useEffect(() => {
    if (location.pathname.toLowerCase().includes("/chat")) {
      const t = setTimeout(() => scrollToBottom(false), 100);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  // --- Maintain bottom on resize/content growth (изображения, шрифты, мобильная клавиатура) ---
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // ResizeObserver следит за изменением размеров контейнера/контента
    resizeObserverRef.current = new ResizeObserver(() => {
      if (isNearBottom()) scrollToBottom(false);
    });
    resizeObserverRef.current.observe(container);

    // Подстрахуемся ещё и событиями изображения (если ChatMessage рендерит <img>)
    const onImgLoad = (e) => {
      if (isNearBottom()) scrollToBottom(false);
    };
    container.addEventListener("load", onImgLoad, true);

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      container.removeEventListener("load", onImgLoad, true);
    };
  }, []);

  // --- First open / tab visibility / focus: прокрутка к низу ---
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setTimeout(() => scrollToBottom(false), 50);
      }
    };
    const handleFocus = () => setTimeout(() => scrollToBottom(false), 50);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    const t = setTimeout(() => scrollToBottom(false), 200);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(t);
    };
  }, []);

  // Reinitialize chat when user changes
  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user?.id]);

  // --- Scroll button visibility ---
  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    setShowScrollButton(!isNearBottom());
  };

  // --- Data layer ---
  const initializeChat = async () => {
    if (!user) return;
    
    try {
      let currentSessionId = user.session_id;
      if (!currentSessionId) {
        currentSessionId = generateSessionId();
        await User.updateMyUserData({ session_id: currentSessionId });
      }
      
      setSessionId(currentSessionId);
      
      // Параллельная загрузка истории чата, базы знаний и настроек
      const [_, knowledgeItems, settings] = await Promise.all([
        loadChatHistory(currentSessionId),
        KnowledgeBase.filter({ is_ai_source: true }),
        AISettings.list()
      ]);
      
      setAiKnowledgeBase(knowledgeItems);
      if (settings.length > 0) setAiSettings(settings[0]);

    } catch (error) {
      console.error("Ошибка инициализации чата:", error);
    }
  };

  const generateSessionId = () => 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const loadChatHistory = async (sessionId) => {
    try {
      const sessions = await ChatSession.filter({ session_id: sessionId, is_active: true });
      if (sessions.length > 0) {
        const session = sessions[0];
        setMessages(session.messages || []);
      }
    } catch (error) {
      console.error("Ошибка загрузки истории:", error);
    }
  };

  const saveChatSession = async (updatedMessages) => {
    if (!sessionId || !user) return;
    
    try {
      const sessions = await ChatSession.filter({ session_id: sessionId });
      const sessionData = {
        session_id: sessionId,
        user_email: user.email,
        messages: updatedMessages,
        last_activity: new Date().toISOString(),
        is_active: true
      };

      if (sessions.length > 0) {
        await ChatSession.update(sessions[0].id, sessionData);
      } else {
        await ChatSession.create(sessionData);
      }
    } catch (error) {
      console.error("Ошибка сохранения сессии:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
      attachments: []
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsTyping(true);

    try {
      const { textResponse, aiAttachments } = await generateAIResponse(inputMessage, updatedMessages);
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: textResponse,
        timestamp: new Date().toISOString(),
        attachments: aiAttachments || [],
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveChatSession(finalMessages);
    } catch (error) {
      console.error("Ошибка получения ответа:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Извините, произошла ошибка при обработке вашего запроса. Попробуйте ещё раз.",
        timestamp: new Date().toISOString(),
        attachments: []
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const generateAIResponse = async (message, chatHistory) => {
    try {
      // --- СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ АРТИКУЛОВ ---
      const articleRegex = /\b((?=\w*\d)(?=\w*[a-zA-Z])\w{3,})\b/i;
      const articleMatch = message.match(articleRegex);

      const knowledgeKeywords = ['текстур', 'интерьер', 'фото', 'изображен', 'картинк', 'выглядит', 'смотрится'];
      const hasKnowledgeKeywords = knowledgeKeywords.some(keyword => message.toLowerCase().includes(keyword));

      if (articleMatch && productIndex) {
        const articleCode = articleMatch[1].toLowerCase(); 
        const matchedProducts = productIndex.get(articleCode) || [];

        if (matchedProducts.length > 0 && !hasKnowledgeKeywords) {
          const product = matchedProducts[0];

          const productInfoPayload = {
            type: "product_info",
            data: {
              name: product.name,
              vendorCode: product.vendorCode,
              description: product.description,
              picture: product.picture,
              price: product.price ? `${product.price} руб.` : 'не указана',
              params: product.params || {}
            }
          };
      
          const jsonStringResponse = JSON.stringify(productInfoPayload);
          const aiAttachments = product.picture ? [{ name: product.name, url: product.picture, type: 'image' }] : [];
          
          return { textResponse: jsonStringResponse, aiAttachments };
        }

        if (!hasKnowledgeKeywords && matchedProducts.length === 0) {
          const searchPrefix = articleMatch[1].toLowerCase();
          const similarArticles = [];
          
          for (const [key, products] of productIndex) {
            if (key.startsWith(searchPrefix) && key !== searchPrefix) {
              similarArticles.push(...products);
            }
          }
          
          if (similarArticles.length > 0) {
            const uniqueArticles = similarArticles.reduce((acc, product) => {
              const existingProduct = acc.find(p => p.vendorCode === product.vendorCode);
              if (!existingProduct) acc.push(product);
              return acc;
            }, []);

            uniqueArticles.sort((a, b) => String(a.vendorCode).localeCompare(String(b.vendorCode)));

            const suggestionText = `Точного артикула ${articleMatch[1].toUpperCase()} не найдено, но есть похожие варианты:\n\n${
              uniqueArticles.map(product => `🔸 **${product.vendorCode}** — ${product.name}`).join('\n')
            }\n\nПожалуйста, уточните, какой именно артикул вас интересует, и я предоставлю подробную информацию о товаре.`;
            
            return { textResponse: suggestionText, aiAttachments: [] };
          } else {
            const notFoundResponse = `Извините, артикул ${articleMatch[1].toUpperCase()} и похожие варианты не найдены в моей базе данных товаров. \n\nПожалуйста, проверьте правильность написания артикула или обратитесь к менеджеру для уточнения информации.`;
            
            return { textResponse: notFoundResponse, aiAttachments: [] };
          }
        }

        if (hasKnowledgeKeywords) {
          const knowledgeItems = aiKnowledgeBase.filter(item => item.type !== 'xml_feed');
          let relevantItems = [];

          if (knowledgeItems.length > 0) {
            const itemListForLLM = knowledgeItems.map(item => ({
              title: item.title,
              description: item.description,
              article_code: item.article_code
            }));
            
            if (itemListForLLM.length > 0) {
              const searchPrompt = `Проанализируй запрос пользователя: "${message}".\n              Найди наиболее релевантные элементы из этого списка:\n              ${JSON.stringify(itemListForLLM, null, 2)}\n              Верни ТОЛЬКО названия (title) самых подходящих элементов. Если ничего не подходит, верни пустой массив.`;

              const jsonSchemaForSearch = {
                type: "object",
                properties: {
                  relevant_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Массив названий наиболее релевантных документов."
                  }
                },
                required: ["relevant_titles"]
              };

              const searchResult = await InvokeLLM({
                prompt: searchPrompt,
                response_json_schema: jsonSchemaForSearch
              });
              
              if (searchResult?.relevant_titles?.length > 0) {
                relevantItems = knowledgeItems.filter(item => searchResult.relevant_titles.includes(item.title));
              }
            }
          }

          if (relevantItems.length > 0) {
            let knowledgeContext = relevantItems.map(item => {
              let itemContext = `Источник: ${item.title}\nОписание: ${item.description || ''}\nСодержимое: ${item.content || ''}`;
              if (item.url) itemContext += `\nСсылка на ресурс: ${item.url}`;
              if (item.file_url) itemContext += `\nСсылка на файл: ${item.file_url}`;
              return itemContext;
            }).join("\n\n---\n\n");
            
            const systemPrompt = `${aiSettings?.system_prompt || 'Вы - полезный ИИ-ассистент.'}\n\nТвоя главная задача — предоставлять пользователю точную информацию и прямые ссылки на материалы из базы знаний. Внимательно изучи предоставленный контекст.\n\nПРАВИЛА ОТВЕТА:\n1. Отвечай СТРОГО на основе предоставленного контекста из базы знаний.\n2. Если в контекте для какого-либо материала (статьи, инструкции, товара) есть "Ссылка на ресурс" или "Ссылка на файл", ты ОБЯЗАН включить эту ссылку в свой ответ. Форматируй ссылки как кликабельные, например: [Название ссылки](URL).\n3. Если ссылок несколько, предоставь их все.\n4. Не придумывай информацию. Если ответа нет в контекте, сообщи об этом.`;
      
            const prompt = `Контекст из базы знаний:\n${knowledgeContext}\n\nИстория чата:\n${chatHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\nЗапрос пользователя: ${message}`;
            
            const textResponse = await InvokeLLM({ prompt: prompt });
      
            const aiAttachments = relevantItems
              .filter(item => item.image_url)
              .map(item => ({ name: item.title, url: item.image_url, type: 'image' }));
      
            return { textResponse, aiAttachments };
          } else {
            const noMaterialsResponse = `К сожалению, я не нашел дополнительных материалов (фото, текстуры, интерьерные решения) для артикула ${articleMatch[1].toUpperCase()} в базе знаний.\n\nПопробуйте обратиться к менеджеру или проверить наличие таких материалов в других источниках.`;
            
            return { textResponse: noMaterialsResponse, aiAttachments: [] };
          }
        }
      }

      // --- ОБЩАЯ ЛОГИКА ---
      const knowledgeItems = aiKnowledgeBase.filter(item => item.type !== 'xml_feed');
      let relevantItems = [];

      if (knowledgeItems.length > 0) {
        const itemListForLLM = knowledgeItems.map(item => ({
          title: item.title,
          description: item.description,
          article_code: item.article_code
        }));
        
        if (itemListForLLM.length > 0) {
          const searchPrompt = `Проанализируй запрос пользователя: "${message}".\n          Найди наиболее релевантные элементы из этого списка:\n          ${JSON.stringify(itemListForLLM, null, 2)}\n          Верни ТОЛЬКО названия (title) самых подходящих элементов. Если ничего не подходит, верни пустой массив.`;

          const jsonSchemaForSearch = {
            type: "object",
            properties: {
              relevant_titles: {
                type: "array",
                items: { type: "string" },
                description: "Массив названий наиболее релевантных документов."
              }
            },
            required: ["relevant_titles"]
          };

          const searchResult = await InvokeLLM({
            prompt: searchPrompt,
            response_json_schema: jsonSchemaForSearch
          });
          
          if (searchResult?.relevant_titles?.length > 0) {
            let foundItems = knowledgeItems.filter(item => searchResult.relevant_titles.includes(item.title));

            const messageLower = message.toLowerCase();
            if (messageLower.includes('логотип')) {
              foundItems = foundItems.filter(item => item.title.toLowerCase().includes('логотип'));
            } else if (messageLower.includes('презентац')) {
              foundItems = foundItems.filter(item => item.title.toLowerCase().includes('презентац'));
            } else if (messageLower.includes('каталог')) {
              foundItems = foundItems.filter(item => item.title.toLowerCase().includes('каталог'));
            } else if (messageLower.includes('сертификат')) {
              foundItems = foundItems.filter(item => item.title.toLowerCase().includes('сертификат'));
            } else if (messageLower.includes('брендбук')) {
              foundItems = foundItems.filter(item => item.title.toLowerCase().includes('брендбук'));
            }

            relevantItems = foundItems;
          }
        }
      }

      if (relevantItems.length > 0) {
        const yandexDiskItems = relevantItems.filter(item => item.type === 'yandex_disk');
        const downloadKeywords = ['скачать', 'документ', 'файл', 'лого', 'каталог', 'инструкци', 'сертификат', 'брендбук', 'презентац'];
        const isDirectDownloadRequest = downloadKeywords.some(keyword => message.toLowerCase().includes(keyword));
        const allRelevantAreYandexDisk = relevantItems.every(item => item.type === 'yandex_disk');
        const shouldShowAsCards = isDirectDownloadRequest || (allRelevantAreYandexDisk && yandexDiskItems.length > 0 && yandexDiskItems.length <= 3);

        if (yandexDiskItems.length > 1 && shouldShowAsCards) {
          const multiDownloadPayload = {
            type: "multi_download_links",
            data: {
              items: yandexDiskItems.map(item => ({
                text: `Скачать "${item.title}"`,
                url: item.url,
                title: item.title
              }))
            }
          };
          return { textResponse: JSON.stringify(multiDownloadPayload), aiAttachments: [] };
        }
        
        if (yandexDiskItems.length === 1 && shouldShowAsCards) {
          const item = yandexDiskItems[0];
          const downloadPayload = {
            type: "download_link",
            data: {
              text: `Вы можете скачать "${item.title}" по следующей ссылке`,
              url: item.url,
            }
          };
          return { textResponse: JSON.stringify(downloadPayload), aiAttachments: [] };
        }

        let knowledgeContext = relevantItems.map(item => {
          let itemContext = `Источник: ${item.title}\nОписание: ${item.description || ''}\nСодержимое: ${item.content || ''}`;
          if (item.url) itemContext += `\nСсылка на ресурс: ${item.url}`;
          if (item.file_url) itemContext += `\nСсылка на файл: ${item.file_url}`;
          return itemContext;
        }).join("\n\n---\n\n");
        
        const systemPrompt = `${aiSettings?.system_prompt || 'Вы - полезный ИИ-ассистент.'}\n\nТвоя главная задача — предоставлять пользователю точную информацию и прямые ссылки на материалы из базы знаний. Внимательно изучи предоставленный контекст.\n\nПРАВИЛА ОТВЕТА:\n1. Отвечай СТРОГО на основе предоставленного контекста из базы знаний.\n2. Если в контекте для какого-либо материала (статьи, инструкции, товара) есть "Ссылка на ресурс" или "Ссылка на файл", ты ОБЯЗАН включить эту ссылку в свой ответ. Форматируй ссылки как кликабельные, например: [Название ссылки](URL).\n3. Если ссылок несколько, предоставь их все.\n4. Не придумывай информацию. Если ответа нет в контекте, сообщи об этом.`;
  
        const prompt = `Контекст из базы знаний:\n${knowledgeContext}\n\nИстория чата:\n${chatHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\nЗапрос пользователя: ${message}`;
        
        const textResponse = await InvokeLLM({ prompt: prompt });
  
        const aiAttachments = relevantItems
          .filter(item => item.image_url)
          .map(item => ({ name: item.title, url: item.image_url, type: 'image' }));
  
        return { textResponse, aiAttachments };
      } else {
        const clarificationPrompt = `Я не смог найти точный ответ на запрос пользователя: "${message}".\nПроанализируй этот запрос и список тем, которые я знаю:\n${JSON.stringify(aiKnowledgeBase.filter(item => item.type !== 'xml_feed').map(i => i.title))}\n\nСформируй дружелюбный уточняющий вопрос. Предложи 3-4 наиболее вероятные темы из списка, которые могли бы заинтересовать пользователя.\nНапример: "Я не совсем уверен, что вы ищете. Возможно, вас интересует что-то из этого: ...?"`;
        
        const clarificationResponse = await InvokeLLM({ prompt: clarificationPrompt });
        
        return { textResponse: clarificationResponse, aiAttachments: [] };
      }
    } catch (error) {
      console.error("Ошибка генерации ответа:", error);
      throw error;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = async () => {
    setMessages([]);
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    if (user) {
      await User.updateMyUserData({ session_id: newSessionId });
    }
    // После очистки — сразу к низу (на якорь)
    requestAnimationFrame(() => scrollToBottom(false));
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
      {/* Header - Only for desktop, mobile uses layout header */}
      <div className="hidden md:block absolute top-0 left-0 right-0 z-20 bg-white/40 backdrop-blur-md border-b border-white/10 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent truncate">
                ИИ-Ассистент
              </h1>
              <p className="text-sm text-slate-600 mt-1">Задайте любой вопрос который вас интересует по нашей базе</p>
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
            <Suspense key={message.id} fallback={null}>
              <ChatMessage message={message} tier={effectiveTier} bonusEnabled={bonusEnabled} />
            </Suspense>
          ))}
        </AnimatePresence>
        {isTyping && (
          <Suspense fallback={null}>
            <TypingIndicator />
          </Suspense>
        )}
        {/* Якорь для прокрутки к самому низу */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Кнопка прокрутки вниз */}
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

      {/* Поле ввода */}
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
                className="min-h-[52px] max-h[150px] bg-white/80 border-slate-200 focus:border-[#007AFF] focus:ring-[#007AFF]/20 rounded-xl resize-none w-full"
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