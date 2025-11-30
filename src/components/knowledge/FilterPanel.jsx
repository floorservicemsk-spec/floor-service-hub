import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

export default function FilterPanel({ 
  showFilters, 
  onClose, 
  filters, 
  onFilterChange, 
  availableCategories 
}) {
  if (!showFilters) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="bg-white/90 backdrop-blur-xl border-white/20 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Фильтры</CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Type Filters */}
              <div>
                <h3 className="font-medium mb-3">Тип материала</h3>
                <div className="space-y-2">
                  {[
                    { value: "document", label: "Документы" },
                    { value: "link", label: "Ссылки" },
                    { value: "yandex_disk", label: "Яндекс.Диск" }
                  ].map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={filters.types?.includes(type.value)}
                        onCheckedChange={(checked) => {
                          const newTypes = checked 
                            ? [...(filters.types || []), type.value]
                            : (filters.types || []).filter(t => t !== type.value);
                          onFilterChange({ ...filters, types: newTypes });
                        }}
                      />
                      <label htmlFor={type.value} className="text-sm">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Filters */}
              {availableCategories.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Категории</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableCategories.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={filters.categories?.includes(category)}
                          onCheckedChange={(checked) => {
                            const newCategories = checked 
                              ? [...(filters.categories || []), category]
                              : (filters.categories || []).filter(c => c !== category);
                            onFilterChange({ ...filters, categories: newCategories });
                          }}
                        />
                        <label htmlFor={category} className="text-sm">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onFilterChange({ types: [], categories: [] })}
              >
                Сбросить фильтры
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}