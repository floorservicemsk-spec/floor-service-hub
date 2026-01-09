/**
 * Client-side API layer
 * Replaces Base44 SDK with fetch calls to our API routes
 */

// Types
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  retailPoint: string | null;
  role: string;
  userType: string;
  isApproved: boolean;
  isBlocked: boolean;
  sessionId: string | null;
  dealerProfile?: DealerProfile | null;
}

export interface DealerProfile {
  id: string;
  userId: string;
  companyName: string | null;
  region: string | null;
  currentTier: string;
  autoTier: string;
  manualTier: string | null;
  manualTierEnabled: boolean;
  manualTierExpiresAt: string | null;
  pointsBalance: number;
  monthlyTurnover: number;
  lastMonthTurnover: number;
  ordersCountMonth: number;
  effectiveTier?: string; // Computed field based on manual/current tier
  currentMonthTurnover?: number; // Alias for monthlyTurnover
}

export interface BonusSettings {
  id: string;
  enabled: boolean;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  type: string;
  url: string | null;
  fileUrl: string | null;
  imageUrl: string | null;
  categories: string[];
  articleCode: string | null;
  isPublic: boolean;
  isAiSource: boolean;
  xmlData: {
    products?: Product[];
    warehouses?: Record<string, string>;
    last_synced?: string;
    total_products?: number;
  } | null;
  lastSync: string | null;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  vendorCode: string;
  price: number | null;
  description: string;
  url: string;
  picture: string;
  vendor: string;
  params: Record<string, unknown>;
  documents?: Array<{ url: string; name: string }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export interface ChatSession {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  isActive: boolean;
  lastActivity: string;
}

export interface AISettings {
  id: string;
  systemPrompt: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  welcomeMessage: string | null;
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth & User
  async me(): Promise<User> {
    return this.request<User>("/api/me");
  }

  async updateUser(data: Partial<User>): Promise<User> {
    return this.request<User>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Registration
  async register(data: {
    email: string;
    password: string;
    displayName?: string;
    fullName?: string;
    phone?: string;
    city?: string;
    userType?: string;
  }): Promise<{
    success: boolean;
    message: string;
    requiresApproval: boolean;
    user?: { id: string; email: string; displayName: string | null; userType: string; isApproved: boolean };
  }> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Bonus Settings
  async getBonusSettings(): Promise<BonusSettings[]> {
    return this.request<BonusSettings[]>("/api/bonus-settings");
  }

  // Knowledge Base
  async getKnowledgeBase(params?: {
    type?: string;
    isPublic?: boolean;
    isAiSource?: boolean;
    search?: string;
    limit?: number;
  }): Promise<KnowledgeBaseItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.isPublic !== undefined) searchParams.set("isPublic", String(params.isPublic));
    if (params?.isAiSource !== undefined) searchParams.set("isAiSource", String(params.isAiSource));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    
    const query = searchParams.toString();
    return this.request<KnowledgeBaseItem[]>(`/api/knowledgebase${query ? `?${query}` : ""}`);
  }

  // Chat
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      return await this.request<ChatSession>(`/api/chat/session?sessionId=${sessionId}`);
    } catch {
      return null;
    }
  }

  async saveChatSession(data: {
    sessionId: string;
    messages: ChatMessage[];
    userEmail?: string;
  }): Promise<ChatSession> {
    return this.request<ChatSession>("/api/chat/session", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendChatMessage(data: {
    message: string;
    sessionId: string;
    chatHistory: ChatMessage[];
  }): Promise<{ content: string; attachments?: Array<{ name: string; url: string; type: string }> }> {
    return this.request("/api/chat", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Settings
  async getAISettings(): Promise<AISettings[]> {
    return this.request<AISettings[]>("/api/ai/settings");
  }

  // Admin - XML Sync
  async syncXmlFeed(knowledgeBaseId: string): Promise<{ success: boolean; products_count?: number }> {
    return this.request("/api/admin/xml/sync", {
      method: "POST",
      body: JSON.stringify({ knowledgeBaseId }),
    });
  }

  // Profile
  async updateProfile(data: {
    displayName?: string;
    phone?: string;
    city?: string;
    retailPoint?: string;
  }): Promise<User> {
    return this.request<User>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // FAQ
  async getFAQs(): Promise<Array<{
    id: string;
    question: string;
    answer: string;
    categoryId?: string;
    keywords?: string[];
    order?: number;
  }>> {
    return this.request("/api/faq");
  }

  async getFAQCategories(): Promise<Array<{
    id: string;
    name: string;
    order?: number;
  }>> {
    return this.request("/api/faq/categories");
  }

  // Video
  async getVideos(): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    embedUrl: string;
    platform?: string;
    categoryId?: string;
    allowedUserTypes?: string[];
    order?: number;
  }>> {
    return this.request("/api/video");
  }

  async getVideoCategories(): Promise<Array<{
    id: string;
    name: string;
    order?: number;
  }>> {
    return this.request("/api/video/categories");
  }

  // Tips / Advice
  async getAdviceArticles(): Promise<Array<{
    id: string;
    slug: string;
    title: string;
    summary?: string;
    type: string;
    coverUrl?: string;
    categoryIds?: string[];
    allowedUserTypes?: string[];
    status?: string;
  }>> {
    return this.request("/api/advice/articles");
  }

  async getAdviceArticleBySlug(slug: string): Promise<{
    id: string;
    slug: string;
    title: string;
    summary?: string;
    html?: string;
    type: string;
    coverUrl?: string;
    checklist?: Array<{
      title: string;
      description?: string;
      isRequired?: boolean;
      order?: number;
    }>;
    attachments?: Array<{
      id: string;
      title?: string;
      url: string;
    }>;
  } | null> {
    return this.request(`/api/advice/articles/${encodeURIComponent(slug)}`);
  }

  async getAdviceCategories(): Promise<Array<{
    id: string;
    name: string;
  }>> {
    return this.request("/api/advice/categories");
  }

  // Legal Entities
  async getLegalEntities(): Promise<Array<{
    id: string;
    name: string;
    inn: string;
    kpp?: string;
    ogrn?: string;
    address?: string;
    isDefault?: boolean;
  }>> {
    return this.request("/api/legal-entities");
  }

  async createLegalEntity(data: {
    name: string;
    inn: string;
    kpp?: string;
    ogrn?: string;
    address?: string;
  }): Promise<{ id: string }> {
    return this.request("/api/legal-entities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLegalEntity(id: string, data: {
    name?: string;
    inn?: string;
    kpp?: string;
    ogrn?: string;
    address?: string;
  }): Promise<{ success: boolean }> {
    return this.request(`/api/legal-entities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteLegalEntity(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/legal-entities/${id}`, {
      method: "DELETE",
    });
  }

  // Orders
  async getOrders(): Promise<Array<{
    id: string;
    orderNumber?: string;
    status: string;
    totalCost: number;
    createdAt: string;
    items?: Array<{
      id: string;
      productName: string;
      quantity: number;
      price: number;
    }>;
  }>> {
    return this.request("/api/orders");
  }

  // Home Banners
  async getHomeBanners(): Promise<Array<{
    id: string;
    title: string;
    subtitle?: string;
    mediaType: string;
    mediaUrl?: string;
    overlayGradient?: string;
    isActive?: boolean;
    startAt?: string;
    endAt?: string;
    priority?: number;
    ctaPrimary?: {
      label?: string;
      href?: string;
      isExternal?: boolean;
    };
    ctaSecondary?: {
      label?: string;
      href?: string;
      isExternal?: boolean;
    };
  }>> {
    return this.request("/api/home-banners");
  }

  // Leaderboard
  async getDealerLeaderboard(): Promise<Array<{
    userId: string;
    name: string;
    tier: string;
    points: number;
  }>> {
    return this.request("/api/dealers/leaderboard");
  }

  // Admin - Compute dealer tiers
  async computeDealerTiers(): Promise<{ success: boolean; updated?: number; error?: string }> {
    return this.request("/api/admin/dealers/compute-tiers", {
      method: "POST",
    });
  }
}

export const api = new ApiClient();
export default api;
