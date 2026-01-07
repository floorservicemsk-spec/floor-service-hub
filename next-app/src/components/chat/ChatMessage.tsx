"use client";

import React from "react";
import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import type { ChatMessage as ChatMessageType } from "@/lib/api";

interface ProductInfoData {
  name: string;
  vendorCode: string;
  description: string;
  picture: string;
  price: string;
  params: Record<string, unknown>;
}

interface DownloadLinkData {
  text: string;
  url: string;
}

interface MultiDownloadLinksData {
  items: Array<{ text: string; url: string; title: string }>;
}

const DownloadLinkCard = ({ linkData }: { linkData: DownloadLinkData }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-800 flex-1 pr-4">{linkData.text}</p>
      <a
        href={linkData.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0"
      >
        <Button className="bg-[#313131] hover:bg-[#4a4a4a] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all">
          СКАЧАТЬ
        </Button>
      </a>
    </div>
  );
};

const MultiDownloadLinksCard = ({
  data,
}: {
  data: MultiDownloadLinksData;
}) => {
  return (
    <div className="space-y-3">
      {data.items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-200/50"
        >
          <p className="text-sm text-slate-800 flex-1 pr-4">{item.text}</p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <Button className="bg-[#313131] hover:bg-[#4a4a4a] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all">
              СКАЧАТЬ
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
};

const ProductInfoCard = ({ product }: { product: ProductInfoData }) => {
  return (
    <div className="bg-white min-h-full">
      {product.picture && (
        <div className="w-full">
          <img
            src={product.picture}
            alt={product.name}
            className="w-full h-48 md:h-64 object-cover block"
          />
        </div>
      )}

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 leading-tight mb-2">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-3">
            <span>Артикул: {product.vendorCode}</span>
            {product.price && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">
                  {product.price}
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-slate-600 text-sm leading-relaxed">
              {product.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface ChatMessageProps {
  message: ChatMessageType;
  tier?: string | null;
  bonusEnabled?: boolean;
}

export default function ChatMessage({
  message,
  tier = null,
  bonusEnabled = true,
}: ChatMessageProps) {
  let contentData: {
    type?: string;
    data?: ProductInfoData | DownloadLinkData | MultiDownloadLinksData;
  } | null = null;
  let isProductInfo = false;
  let isDownloadLink = false;
  let isMultiDownloadLinks = false;
  const isUser = message.role === "user";

  try {
    contentData = JSON.parse(message.content);
    if (contentData && contentData.type === "product_info") {
      isProductInfo = true;
    }
    if (contentData && contentData.type === "download_link") {
      isDownloadLink = true;
    }
    if (contentData && contentData.type === "multi_download_links") {
      isMultiDownloadLinks = true;
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Tier-based glow for user avatar
  const userAvatarGlow = (() => {
    if (!bonusEnabled || !tier) {
      return "bg-gradient-to-br from-[#0A84FF] to-[#007AFF] ring-2 ring-blue-300/40 shadow-[0_0_18px_rgba(59,130,246,0.25)]";
    }
    switch (tier) {
      case "TIER4":
        return "bg-gradient-to-br from-indigo-500 to-blue-500 ring-2 ring-indigo-300/60 shadow-[0_0_22px_rgba(99,102,241,0.35)]";
      case "TIER3":
        return "bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-300 ring-2 ring-amber-300/60 shadow-[0_0_22px_rgba(245,158,11,0.35)]";
      case "TIER2":
        return "bg-gradient-to-br from-zinc-200 via-slate-100 to-white ring-2 ring-zinc-300/60 shadow-[0_0_18px_rgba(148,163,184,0.25)]";
      case "TIER1":
      default:
        return "bg-gradient-to-br from-slate-200 to-slate-300 ring-2 ring-slate-300/60 shadow-[0_0_16px_rgba(100,116,139,0.25)]";
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-2 ${
          isUser ? userAvatarGlow : "bg-white/80 border border-white/50"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-slate-600" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-3xl ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl shadow-sm ${
            isUser
              ? "bg-[#0A84FF] text-white ml-auto px-5 py-3"
              : isProductInfo
                ? "bg-white border border-white/60 mr-auto w-full overflow-hidden p-0 rounded-2xl shadow"
                : isDownloadLink || isMultiDownloadLinks
                  ? "bg-white mr-auto w-full p-3 rounded-2xl border border-white/60 shadow"
                  : "bg-white mr-auto px-5 py-3 rounded-2xl border border-white/60 shadow"
          }`}
        >
          {isProductInfo && contentData?.data ? (
            <ProductInfoCard product={contentData.data as ProductInfoData} />
          ) : isDownloadLink && contentData?.data ? (
            <DownloadLinkCard linkData={contentData.data as DownloadLinkData} />
          ) : isMultiDownloadLinks && contentData?.data ? (
            <MultiDownloadLinksCard
              data={contentData.data as MultiDownloadLinksData}
            />
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-white">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-slate">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#007AFF] hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-slate-500 mt-2 px-2 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {format(new Date(message.timestamp), "HH:mm", { locale: ru })}
        </div>
      </div>
    </motion.div>
  );
}
