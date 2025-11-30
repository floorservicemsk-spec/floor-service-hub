
import React, { useEffect, useMemo, useState } from "react";
import { AdviceArticle } from "@/entities/AdviceArticle";
import { AdviceMedia } from "@/entities/AdviceMedia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TipDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug") || "";
  const [article, setArticle] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [checked, setChecked] = useState({});
  const [cover, setCover] = useState(null);

  useEffect(() => {
    load();
  }, [slug]);

  const load = async () => {
    const items = await AdviceArticle.filter({ slug }, "-updated_date", 1);
    if (items.length) {
      const a = items[0];
      setArticle(a);
      // cover
      if (a.cover_media_id) {
        const cm = await AdviceMedia.filter({ id: a.cover_media_id }, undefined, 1);
        if (cm.length) setCover(cm[0]);
      }
      // attachments (только нужные id, без AdviceMedia.list())
      const ids = (a.attachment_ids || []).filter(Boolean);
      if (ids.length) {
        const results = await Promise.all(ids.map(async id => {
          const arr = await AdviceMedia.filter({ id }, undefined, 1);
          return arr[0] || null;
        }));
        setAttachments(results.filter(Boolean));
      } else {
        setAttachments([]);
      }
    }
  };

  const onToggle = (idx) => setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));

  if (!article) return <div className="p-6">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link to={createPageUrl("Tips")} className="inline-flex items-center text-blue-600 hover:underline">
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад к списку
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden">
          {/* Cover */}
          {(article?.cover_media_id || cover) && (
            <div className="w-full aspect-video bg-slate-100">
              {cover?.url ? (
                <img src={cover.url} alt={article.title} className="w-full h-full object-cover" />
              ) : null}
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {article.type === 'checklist' ? 'Чек‑лист' : 'Статья'}
              </Badge>
              {/* Убрано: бейдж «Опубликовано» */}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">{article.title}</h1>
            {article.summary && <p className="text-slate-600 mb-4">{article.summary}</p>}

            {article.html && (
              <div className="prose max-w-none mb-6 prose-slate" dangerouslySetInnerHTML={{ __html: article.html }} />
            )}

            {Array.isArray(article.checklist) && article.checklist.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Чек‑лист</h2>
                <ul className="space-y-2">
                  {article.checklist
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <button
                        onClick={() => onToggle(idx)}
                        className={`mt-0.5 rounded-full border w-5 h-5 flex items-center justify-center ${checked[idx] ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                        aria-label="Отметить пункт"
                      >
                        {checked[idx] && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        {item.description && <div className="text-sm text-slate-600">{item.description}</div>}
                        {item.is_required && <Badge variant="outline" className="mt-1">Обязательный</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-3">Вложения</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map(a => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-xl border hover:bg-slate-50 transition">
                      <Paperclip className="w-4 h-4 text-slate-500" />
                      <span className="truncate">{a.title || a.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Link to={createPageUrl("Tips")}>
                <Button className="bg-[#007AFF] hover:bg-[#0a6cff]">К списку</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
