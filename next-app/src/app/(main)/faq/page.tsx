"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  categoryId?: string;
  keywords?: string[];
  order?: number;
}

interface FAQCategory {
  id: string;
  name: string;
  order?: number;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [faqData, categoryData] = await Promise.all([
        api.getFAQs(),
        api.getFAQCategories(),
      ]);
      setFaqs(faqData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Ошибка загрузки FAQ:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = useMemo(() => {
    let filtered = faqs;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((faq) => faq.categoryId === selectedCategory);
    }

    // Search by text
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          (faq.keywords &&
            faq.keywords.some((keyword) =>
              keyword.toLowerCase().includes(query)
            ))
      );
    }

    return filtered;
  }, [faqs, searchQuery, selectedCategory]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pagedFaqs = filteredFaqs.slice(start, end);

  const canPrev = page > 1;
  const canNext = end < filteredFaqs.length;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => p + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0A84FF] to-[#007AFF] rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0A84FF] to-[#007AFF] bg-clip-text text-transparent mb-4">
              Часто задаваемые вопросы
            </h1>
            <p className="text-slate-600 text-lg">
              Найдите ответы на самые популярные вопросы
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Поиск по вопросам и ответам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-4 text-lg bg-white/80 border-slate-200 focus:border-blue-300 focus:ring-blue-300/20 rounded-xl"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className={
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white hover:shadow-[0_0_15px_rgba(0,122,255,0.4)]"
                  : "border-slate-200 hover:bg-slate-50"
              }
            >
              Все вопросы
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white hover:shadow-[0_0_15px_rgba(0,122,255,0.4)]"
                    : "border-slate-200 hover:bg-slate-50"
                }
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mt-6 text-center">
            <Badge variant="outline" className="bg-white/50 border-slate-200">
              {filteredFaqs.length} вопрос
              {filteredFaqs.length === 1
                ? ""
                : filteredFaqs.length < 5
                  ? "а"
                  : "ов"}
            </Badge>
          </div>
        </div>

        {/* FAQ List */}
        <AnimatePresence mode="wait">
          {pagedFaqs.length > 0 ? (
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Accordion type="single" collapsible className="space-y-4">
                {pagedFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AccordionItem
                      value={faq.id}
                      className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-2 shadow-lg hover:bg-white/80 transition-all duration-300"
                    >
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {faq.question}
                          </h3>
                          {faq.categoryId && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-800"
                              >
                                {getCategoryName(faq.categoryId)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-6">
                        <div className="prose prose-slate max-w-none">
                          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                            {faq.answer}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          ) : (
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 text-center p-12">
              <CardContent>
                <HelpCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-800 mb-2">
                  Вопросы не найдены
                </h3>
                <p className="text-slate-600">
                  {searchQuery
                    ? `По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить поисковый запрос.`
                    : "В выбранной категории пока нет вопросов."}
                </p>
              </CardContent>
            </Card>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {filteredFaqs.length > pageSize && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={goPrev} disabled={!canPrev}>
              Назад
            </Button>
            <span className="text-sm text-slate-600">Страница {page}</span>
            <Button variant="outline" onClick={goNext} disabled={!canNext}>
              Вперёд
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
