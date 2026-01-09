import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Force dynamic rendering - this route should never be statically analyzed
export const dynamic = "force-dynamic";

// Dynamic import to avoid build-time issues
async function getXMLParser() {
  const { XMLParser } = await import("fast-xml-parser");
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: true,
    isArray: (name: string) =>
      ["param", "warehouse", "quantity_in_stock", "price", "picture"].includes(
        name
      ),
  });
}

function parseStock(text: string | null | undefined): {
  inStock: boolean;
  displayText: string;
} {
  if (!text)
    return { inStock: false, displayText: "Нет в наличии" };
  const t = String(text).toLowerCase().trim();

  if (/срок поставки/i.test(t)) {
    return { inStock: false, displayText: t };
  }

  if (/^(0|нет|отсутствует|не в наличии|нет в наличии)/.test(t)) {
    return { inStock: false, displayText: "Нет в наличии" };
  }
  const match = t.match(/(\d+)/);
  if (match) {
    const qty = parseInt(match[1], 10);
    return {
      inStock: qty > 0,
      displayText: qty > 0 ? `В наличии (${qty} уп.)` : "Нет в наличии",
    };
  }
  return { inStock: true, displayText: "В наличии" };
}

interface Offer {
  "@_id"?: string;
  "@_available"?: string;
  name?: string;
  vendorCode?: string;
  description?: string;
  url?: string;
  picture?: string | string[] | { "#text": string }[];
  vendor?: string;
  country_of_origin?: string;
  quantity?: string;
  param?: Array<{ "@_name": string; "#text": string }>;
  prices?: { price?: Array<{ "@_type"?: string; "#text"?: number }> | { "@_type"?: string; "#text"?: number } };
  price?: Array<{ "@_type"?: string; "#text"?: number }> | { "@_type"?: string; "#text"?: number };
  quantity_in_stock?: Array<{ "@_warehouse_id"?: string; "#text"?: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { knowledgeBaseId } = body;

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { success: false, error: "knowledgeBaseId is required" },
        { status: 400 }
      );
    }

    const item = await prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!item || item.type !== "XML_FEED" || !item.url) {
      return NextResponse.json(
        { success: false, error: "Invalid item or missing URL for XML feed." },
        { status: 404 }
      );
    }

    console.log(`[syncXmlFeed] Starting sync for: ${item.title}`);
    console.log(`[syncXmlFeed] URL: ${item.url}`);

    const xmlResponse = await fetch(item.url);
    if (!xmlResponse.ok) {
      const errorMsg = `Failed to fetch XML feed: ${xmlResponse.status} ${xmlResponse.statusText}`;
      console.error(`[syncXmlFeed] ${errorMsg}`);
      return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }

    const buffer = await xmlResponse.arrayBuffer();

    // Detect encoding
    let xmlText: string;
    let encoding = "windows-1251";

    const headerBytes = new Uint8Array(buffer.slice(0, 200));
    const headerText = new TextDecoder("ascii").decode(headerBytes);

    const encodingMatch = headerText.match(/encoding=["']([^"']+)["']/i);
    if (encodingMatch) {
      encoding = encodingMatch[1].toLowerCase();
    }

    if (encoding === "utf-8" || encoding === "utf8") {
      encoding = "utf-8";
    } else if (encoding === "windows-1251" || encoding === "cp1251") {
      encoding = "windows-1251";
    }

    try {
      const decoder = new TextDecoder(encoding);
      xmlText = decoder.decode(buffer);
    } catch {
      const fallbackDecoder = new TextDecoder("windows-1251");
      xmlText = fallbackDecoder.decode(buffer);
      encoding = "windows-1251 (fallback)";
    }

    console.log(`[syncXmlFeed] XML fetched, size: ${xmlText.length} bytes`);

    const parser = await getXMLParser();
    const jsonObj = parser.parse(xmlText);

    // Hardcoded warehouse mapping
    const warehouses: Record<string, string> = {
      "1": "Москва",
      "2": "Новосибирск",
      "3": "Санкт-Петербург",
    };

    // Extract offers
    let offers: Offer[] = [];
    if (jsonObj.yml_catalog?.shop?.offers?.offer) {
      offers = jsonObj.yml_catalog.shop.offers.offer;
    } else if (jsonObj.catalog?.shop?.offers?.offer) {
      offers = jsonObj.catalog.shop.offers.offer;
    } else if (jsonObj.shop?.offers?.offer) {
      offers = jsonObj.shop.offers.offer;
    } else if (jsonObj.offers?.offer) {
      offers = jsonObj.offers.offer;
    }

    if (!Array.isArray(offers)) {
      offers = offers ? [offers] : [];
    }

    console.log(`[syncXmlFeed] Found ${offers.length} offers`);

    if (offers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No offers found in XML feed.",
          debug: {
            rootKeys: Object.keys(jsonObj),
          },
        },
        { status: 400 }
      );
    }

    const products = offers.map((offer, idx) => {
      const params: Record<string, unknown> = {};
      let photo1: string | null = null;
      const documents: Array<{ url: string; name: string }> = [];

      const vendorCode = String(offer.vendorCode || "");

      // Parse parameters
      if (offer.param) {
        const paramArray = Array.isArray(offer.param) ? offer.param : [offer.param];

        paramArray.forEach((p) => {
          if (p["@_name"] && p["#text"] != null) {
            const rawName = String(p["@_name"]).trim();
            const rawValue = String(p["#text"]).trim();

            const keyNorm = rawName.toLowerCase();

            if (keyNorm === "фото1") {
              photo1 = rawValue;
              return;
            }

            if (
              ["фото2", "фото3", "фото4", "url", "ссылка на qr"].includes(keyNorm)
            ) {
              return;
            }

            if (
              keyNorm.startsWith("документы файл") ||
              keyNorm.startsWith("документы наименование")
            ) {
              params[rawName] = rawValue;
              return;
            }

            const key =
              keyNorm === "остаток" ||
              keyNorm === "наличие" ||
              keyNorm === "quantity" ||
              keyNorm === "количество на складе" ||
              keyNorm === "склад" ||
              keyNorm === "stock"
                ? "Остаток"
                : rawName;

            params[key] = rawValue;
          }
        });
      }

      // Parse documents
      const docFiles: Record<string, string> = {};
      const docNames: Record<string, string> = {};

      Object.keys(params).forEach((key) => {
        const keyLower = key.toLowerCase();
        const fileMatch = keyLower.match(/документы файл (\d+)/);
        const nameMatch = keyLower.match(/документы наименование (\d+)/);

        if (fileMatch) {
          docFiles[fileMatch[1]] = params[key] as string;
        } else if (nameMatch) {
          docNames[nameMatch[1]] = params[key] as string;
        }
      });

      Object.keys(docFiles).forEach((num) => {
        const url = docFiles[num];
        const name = docNames[num] || `Документ ${num}`;
        if (url && url.trim()) {
          documents.push({ url: url.trim(), name: name.trim() });
        }
      });

      if (offer.country_of_origin) {
        params["Страна производитель"] = offer.country_of_origin;
      }

      // Parse price
      let price: number | null = null;

      if (offer.prices && offer.prices.price) {
        const priceArray = Array.isArray(offer.prices.price)
          ? offer.prices.price
          : [offer.prices.price];
        const rrcPrice = priceArray.find((p) => p["@_type"] === "RRC");
        if (rrcPrice) {
          price =
            typeof rrcPrice === "object" ? (rrcPrice["#text"] as number) : rrcPrice;
        } else {
          const firstPrice = priceArray[0];
          price =
            typeof firstPrice === "object"
              ? (firstPrice["#text"] as number)
              : (firstPrice as unknown as number);
        }
      } else if (offer.price) {
        const priceArray = Array.isArray(offer.price)
          ? offer.price
          : [offer.price];
        const rrcPrice = priceArray.find((p) => p["@_type"] === "RRC");
        if (rrcPrice) {
          price =
            typeof rrcPrice === "object" ? (rrcPrice["#text"] as number) : rrcPrice;
        } else {
          const firstPrice = priceArray[0];
          price =
            typeof firstPrice === "object"
              ? (firstPrice["#text"] as number)
              : (firstPrice as unknown as number);
        }
      }

      // Parse warehouse stock
      const warehouseStock: Record<string, string> = {};
      let aggregatedStock = "";

      if (offer.quantity_in_stock) {
        const stockArray = Array.isArray(offer.quantity_in_stock)
          ? offer.quantity_in_stock
          : [offer.quantity_in_stock];
        stockArray.forEach((stock) => {
          const whId = stock["@_warehouse_id"];
          const stockValue =
            typeof stock === "object" ? stock["#text"] : stock;
          if (whId && stockValue) {
            const whName = warehouses[whId] || `Склад ${whId}`;
            warehouseStock[whName] = String(stockValue).trim();
          }
        });

        const numericStocks = Object.values(warehouseStock)
          .map((s) => {
            const match = String(s).match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);

        if (numericStocks.length > 0) {
          const totalStock = numericStocks.reduce((a, b) => a + b, 0);
          aggregatedStock = `${totalStock} уп.`;
        } else {
          aggregatedStock = Object.values(warehouseStock)[0] || "";
        }
      }

      if (Object.keys(warehouseStock).length > 0) {
        params["Склады"] = warehouseStock;
      }

      if (!("Остаток" in params)) {
        if (aggregatedStock) {
          params["Остаток"] = aggregatedStock;
        } else if (
          String(offer["@_available"] || "").toLowerCase() === "true"
        ) {
          params["Остаток"] = "в наличии";
        } else if (offer.quantity) {
          params["Остаток"] = String(offer.quantity);
        }
      }

      const stockInfo = parseStock((params["Остаток"] as string) || "");
      const numericStock = String(params["Остаток"] || "").match(/\d+/);
      const stockNumber = numericStock
        ? parseInt(numericStock[0], 10)
        : stockInfo.inStock
          ? 1
          : 0;

      params["Остаток_число"] = String(stockNumber);

      // Get picture
      let productPicture = photo1 || offer.picture;
      if (Array.isArray(productPicture)) {
        const first = productPicture[0];
        productPicture =
          typeof first === "object" && "#text" in first
            ? first["#text"]
            : (first as string);
      }

      return {
        id: offer["@_id"],
        name: offer.name || "",
        vendorCode: vendorCode,
        price: price || null,
        description:
          typeof offer.description === "string" ? offer.description : "",
        url: offer.url || "",
        picture: productPicture,
        vendor: offer.vendor || "",
        params: params,
        documents: documents,
      };
    });

    // Generate content for AI
    const contentForAI = products
      .map((p) => {
        const parts = [
          `Товар: ${p.name}`,
          `Артикул: ${p.vendorCode}`,
          p.vendor ? `Производитель: ${p.vendor}` : "",
          p.price ? `Цена: ${p.price} руб/м²` : "",
          p.description ? `Описание: ${p.description}` : "",
        ];

        if (p.params) {
          Object.entries(p.params).forEach(([key, value]) => {
            if (key === "Склады" && typeof value === "object") {
              parts.push(`Остатки по складам:`);
              Object.entries(value as Record<string, string>).forEach(
                ([whName, whStock]) => {
                  parts.push(`  - ${whName}: ${whStock}`);
                }
              );
            } else if (
              key !== "Остаток_число" &&
              !key.toLowerCase().startsWith("документы")
            ) {
              parts.push(`${key}: ${value}`);
            }
          });
        }

        if (p.documents && p.documents.length > 0) {
          parts.push(`Документы:`);
          p.documents.forEach((doc) => {
            parts.push(`  - ${doc.name}: ${doc.url}`);
          });
        }

        return parts.filter(Boolean).join("\n");
      })
      .join("\n\n---\n\n");

    // Update database
    await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: {
        xmlData: {
          products: products as unknown as object[],
          warehouses: warehouses,
          last_synced: new Date().toISOString(),
          total_products: products.length,
        } as object,
        content: contentForAI,
        lastSync: new Date(),
      },
    });

    console.log(`[syncXmlFeed] Successfully synced ${products.length} products`);

    return NextResponse.json({
      success: true,
      products_count: products.length,
      warehouses_count: Object.keys(warehouses).length,
      encoding: encoding,
    });
  } catch (error) {
    console.error("[syncXmlFeed] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
