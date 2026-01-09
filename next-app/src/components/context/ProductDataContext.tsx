"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { api, Product, KnowledgeBaseItem } from "@/lib/api";

interface ProductDataContextValue {
  products: Product[];
  productIndex: Map<string, Product[]> | null;
  calculatorProducts: Product[];
  loading: boolean;
  lastSync: string | null;
  findProductByCode: (code: string) => Product | null;
  searchProducts: (query: string, limit?: number) => Product[];
  refresh: () => Promise<void>;
}

const ProductDataContext = createContext<ProductDataContextValue | null>(null);

export function ProductDataProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productIndex, setProductIndex] = useState<Map<string, Product[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const knowledgeItems = await api.getKnowledgeBase({ type: "XML_FEED" });

      let allProducts: Product[] = [];
      for (const item of knowledgeItems) {
        if (item.xmlData?.products) {
          allProducts = [...allProducts, ...item.xmlData.products];
        }
        if (item.lastSync) {
          setLastSync(item.lastSync);
        }
      }

      setProducts(allProducts);

      // Create index for fast lookup by vendor code
      const index = new Map<string, Product[]>();
      for (const product of allProducts) {
        if (product.vendorCode) {
          const code = String(product.vendorCode).toLowerCase();
          if (!index.has(code)) index.set(code, []);
          index.get(code)!.push(product);
        }
      }
      setProductIndex(index);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filter products for calculator (with price and area per package)
  const calculatorProducts = useMemo(() => {
    return products.filter((product) => {
      const hasAreaParam =
        product.params && product.params["Кол-во м2 в упаковке"];
      const hasPrice = product.price;
      return hasAreaParam && hasPrice;
    });
  }, [products]);

  const findProductByCode = useCallback(
    (code: string): Product | null => {
      if (!productIndex || !code) return null;
      const matches = productIndex.get(code.toLowerCase());
      return matches?.[0] || null;
    },
    [productIndex]
  );

  const searchProducts = useCallback(
    (query: string, limit = 50): Product[] => {
      if (!query?.trim()) return products.slice(0, limit);

      const q = query.toLowerCase();
      return products
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.vendorCode?.toLowerCase().includes(q) ||
            p.vendor?.toLowerCase().includes(q)
        )
        .slice(0, limit);
    },
    [products]
  );

  const value: ProductDataContextValue = {
    products,
    productIndex,
    calculatorProducts,
    loading,
    lastSync,
    findProductByCode,
    searchProducts,
    refresh: loadProducts,
  };

  return (
    <ProductDataContext.Provider value={value}>
      {children}
    </ProductDataContext.Provider>
  );
}

export function useProductData() {
  const context = useContext(ProductDataContext);
  if (!context) {
    throw new Error("useProductData must be used within a ProductDataProvider");
  }
  return context;
}

export default ProductDataContext;
