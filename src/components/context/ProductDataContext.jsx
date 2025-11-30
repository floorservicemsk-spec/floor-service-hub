import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { KnowledgeBase } from "@/entities/KnowledgeBase";

const ProductDataContext = createContext(null);

export function ProductDataProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [productIndex, setProductIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const knowledgeItems = await KnowledgeBase.filter({ type: 'xml_feed' });
      
      let allProducts = [];
      for (const item of knowledgeItems) {
        if (item.xml_data?.products) {
          allProducts = [...allProducts, ...item.xml_data.products];
        }
        if (item.last_sync) {
          setLastSync(item.last_sync);
        }
      }
      
      setProducts(allProducts);
      
      // Создаём индекс для быстрого поиска по артикулу
      const index = new Map();
      for (const product of allProducts) {
        if (product.vendorCode) {
          const code = String(product.vendorCode).toLowerCase();
          if (!index.has(code)) index.set(code, []);
          index.get(code).push(product);
        }
      }
      setProductIndex(index);
      
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Фильтрованные продукты для калькулятора (с ценой и м² в упаковке)
  const calculatorProducts = useMemo(() => {
    return products.filter(product => {
      const hasAreaParam = product.params && product.params['Кол-во м2 в упаковке'];
      const hasPrice = product.price;
      return hasAreaParam && hasPrice;
    });
  }, [products]);

  const findProductByCode = useCallback((code) => {
    if (!productIndex || !code) return null;
    const matches = productIndex.get(code.toLowerCase());
    return matches?.[0] || null;
  }, [productIndex]);

  const searchProducts = useCallback((query, limit = 50) => {
    if (!query?.trim()) return products.slice(0, limit);
    
    const q = query.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.vendorCode?.toLowerCase().includes(q) ||
      p.vendor?.toLowerCase().includes(q)
    ).slice(0, limit);
  }, [products]);

  const value = {
    products,
    productIndex,
    calculatorProducts,
    loading,
    lastSync,
    findProductByCode,
    searchProducts,
    refresh: loadProducts
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
    throw new Error('useProductData must be used within a ProductDataProvider');
  }
  return context;
}

export default ProductDataContext;