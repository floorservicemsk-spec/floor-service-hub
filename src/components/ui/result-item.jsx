import React from 'react';
import { Card, CardContent } from './glass-card';
import { Badge } from './glass-badge';
import { Button } from './glass-button';
import { ColorSwatch } from './color-swatch';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

const ResultItem = ({ 
  image, 
  name, 
  vendorCode, 
  colorText, 
  colorHex,
  price, 
  stockInfo, 
  url, 
  distance,
  className,
  ...props 
}) => {
  const handleOpenUrl = () => {
    if (url) {
      window.open(url, '_blank', 'noopener noreferrer');
    }
  };

  return (
    <Card 
      level="l2" 
      hover 
      className={cn("transition-all duration-200 overflow-hidden", className)}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex gap-4 items-start">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-16 h-16">
            {image ? (
              <img 
                src={image} 
                alt={name} 
                className="w-full h-full object-cover rounded-lg shadow-sm" 
              />
            ) : (
              <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 mb-1 truncate">
              {name}
            </h3>
            <p className="text-caption text-secondary mb-2">
              Артикул: {vendorCode}
            </p>
            
            <div className="flex items-center gap-2 mb-3">
              {colorHex && <ColorSwatch color={colorHex} size={20} />}
              <span className="text-caption text-secondary">
                Цвет: {colorText}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <Badge 
                variant={stockInfo?.inStock ? "success" : "neutral"}
              >
                {stockInfo?.displayText || "Нет данных"}
              </Badge>
              
              {price && (
                <Badge variant="accent">
                  {price} ₽/м²
                </Badge>
              )}
              
              {distance !== undefined && distance !== Infinity && (
                <Badge variant="neutral" className="text-xs">
                  Схожесть: {Math.round((1 - distance/441) * 100)}%
                </Badge>
              )}
            </div>
            
            {url && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleOpenUrl}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Открыть товар
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { ResultItem };