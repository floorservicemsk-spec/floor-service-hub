// Re-export types from api
export type {
  User,
  DealerProfile,
  BonusSettings,
  KnowledgeBaseItem,
  Product,
  ChatMessage,
  ChatSession,
  AISettings,
} from "@/lib/api";

// Additional types
export interface ChatPayload {
  type: "product_info" | "download_link" | "multi_download_links";
  data: ProductInfoData | DownloadLinkData | MultiDownloadLinksData;
}

export interface ProductInfoData {
  name: string;
  vendorCode: string;
  description: string;
  picture: string;
  price: string;
  params: Record<string, unknown>;
}

export interface DownloadLinkData {
  text: string;
  url: string;
}

export interface MultiDownloadLinksData {
  items: Array<{
    text: string;
    url: string;
    title: string;
  }>;
}

export interface StockInfo {
  inStock: boolean;
  displayText: string;
}
