"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Paperclip } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";

interface ChecklistItem {
  title: string;
  description?: string;
  isRequired?: boolean;
  order?: number;
}

interface Attachment {
  id: string;
  title?: string;
  url: string;
}

interface AdviceArticle {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  html?: string;
  type: string;
  coverUrl?: string;
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
}

export default function TipDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [article, setArticle] = useState<AdviceArticle | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await api.getAdviceArticleBySlug(decodeURIComponent(slug));
      setArticle(data);
    } catch (error) {
      console.error("Error loading article:", error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggle = (idx: number) =>
    setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4">
            <Link
              href="/tips"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Назад к списку
            </Link>
          </div>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-slate-900">
              Статья не найдена
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link
            href="/tips"
            className="inline-flex items-center text-blue-600 hover:underline"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад к списку
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden">
          {/* Cover */}
          {article.coverUrl && (
            <div className="w-full aspect-video bg-slate-100 relative">
              <Image
                src={article.coverUrl}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 80vw"
                priority
                unoptimized
              />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {article.type === "checklist" ? "Чек‑лист" : "Статья"}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              {article.title}
            </h1>
            {article.summary && (
              <p className="text-slate-600 mb-4">{article.summary}</p>
            )}

            {article.html && (
              <div
                className="prose max-w-none mb-6 prose-slate"
                dangerouslySetInnerHTML={{ __html: article.html }}
              />
            )}

            {Array.isArray(article.checklist) &&
              article.checklist.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Чек‑лист</h2>
                  <ul className="space-y-2">
                    {article.checklist
                      .slice()
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3"
                        >
                          <button
                            onClick={() => onToggle(idx)}
                            className={`mt-0.5 rounded-full border w-5 h-5 flex items-center justify-center ${
                              checked[idx]
                                ? "bg-blue-600 border-blue-600"
                                : "bg-white border-slate-300"
                            }`}
                            aria-label="Отметить пункт"
                          >
                            {checked[idx] && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </button>
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-sm text-slate-600">
                                {item.description}
                              </div>
                            )}
                            {item.isRequired && (
                              <Badge variant="outline" className="mt-1">
                                Обязательный
                              </Badge>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

            {article.attachments && article.attachments.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-3">Вложения</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {article.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl border hover:bg-slate-50 transition"
                    >
                      <Paperclip className="w-4 h-4 text-slate-500" />
                      <span className="truncate">{a.title || a.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/tips">
                <Button className="bg-[#007AFF] hover:bg-[#0a6cff]">
                  К списку
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
