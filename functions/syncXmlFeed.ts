import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { XMLParser } from "npm:fast-xml-parser@4.3.2";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: true,
    isArray: (name) => ['param', 'warehouse', 'quantity_in_stock', 'price', 'picture'].includes(name)
});

function parseStock(text) {
    if (!text) return { inStock: false, displayText: "Нет в наличии" };
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
        return { inStock: qty > 0, displayText: qty > 0 ? `В наличии (${qty} уп.)` : "Нет в наличии" };
    }
    return { inStock: true, displayText: "В наличии" };
}

Deno.serve(async (req) => {
    try {
        const { knowledgeBaseId } = await req.json();

        if (!knowledgeBaseId) {
            return Response.json({ 
                success: false, 
                error: 'knowledgeBaseId is required' 
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized' 
            }, { status: 401 });
        }
        
        if (user.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Forbidden: Admin access required' 
            }, { status: 403 });
        }

        const item = await base44.asServiceRole.entities.KnowledgeBase.get(knowledgeBaseId);

        if (!item || item.type !== 'xml_feed' || !item.url) {
            return Response.json({ 
                success: false,
                error: 'Invalid item or missing URL for XML feed.' 
            }, { status: 404 });
        }
        
        console.log(`[syncXmlFeed] Starting sync for: ${item.title}`);
        console.log(`[syncXmlFeed] URL: ${item.url}`);
        
        const xmlResponse = await fetch(item.url);
        if (!xmlResponse.ok) {
            const errorMsg = `Failed to fetch XML feed: ${xmlResponse.status} ${xmlResponse.statusText}`;
            console.error(`[syncXmlFeed] ${errorMsg}`);
            return Response.json({ 
                success: false, 
                error: errorMsg 
            }, { status: 500 });
        }

        const buffer = await xmlResponse.arrayBuffer();
        
        // First, try to detect encoding from XML declaration
        let xmlText;
        let encoding = 'windows-1251'; // default
        
        // Read first 200 bytes to check XML declaration
        const headerBytes = new Uint8Array(buffer.slice(0, 200));
        const headerText = new TextDecoder('ascii').decode(headerBytes);
        
        // Check for encoding declaration
        const encodingMatch = headerText.match(/encoding=["']([^"']+)["']/i);
        if (encodingMatch) {
            encoding = encodingMatch[1].toLowerCase();
            console.log(`[syncXmlFeed] Detected encoding from XML: ${encoding}`);
        }
        
        // Normalize encoding name
        if (encoding === 'utf-8' || encoding === 'utf8') {
            encoding = 'utf-8';
        } else if (encoding === 'windows-1251' || encoding === 'cp1251') {
            encoding = 'windows-1251';
        }
        
        try {
            const decoder = new TextDecoder(encoding);
            xmlText = decoder.decode(buffer);
            console.log(`[syncXmlFeed] Successfully decoded with ${encoding}`);
        } catch (e) {
            console.error(`[syncXmlFeed] Failed to decode with ${encoding}, trying windows-1251`);
            const fallbackDecoder = new TextDecoder('windows-1251');
            xmlText = fallbackDecoder.decode(buffer);
            encoding = 'windows-1251 (fallback)';
        }
        
        console.log(`[syncXmlFeed] XML fetched, size: ${xmlText.length} bytes`);
        console.log(`[syncXmlFeed] First 500 chars:`, xmlText.substring(0, 500));
        
        const jsonObj = parser.parse(xmlText);
        
        console.log(`[syncXmlFeed] XML parsed to JSON`);
        console.log(`[syncXmlFeed] Structure keys:`, Object.keys(jsonObj));
        
        // Extract warehouses information - HARDCODED MAPPING
        const warehouses = {
            '1': 'Москва',
            '2': 'Новосибирск',
            '3': 'Санкт-Петербург'
        };
        
        console.log(`[syncXmlFeed] Using hardcoded warehouse mapping:`, warehouses);
        
        // Try multiple possible paths for offers
        let offers = [];
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
            return Response.json({ 
                success: false, 
                error: 'No offers found in XML feed. Check XML structure.',
                debug: {
                    rootKeys: Object.keys(jsonObj),
                    sampleStructure: JSON.stringify(jsonObj).substring(0, 500)
                }
            }, { status: 400 });
        }

        const products = offers.map((offer, idx) => {
            const params = {};
            let photo1 = null;
            const documents = []; // Array of {url, name} pairs
            
            const vendorCode = String(offer.vendorCode || '');
            const isDebugProduct = vendorCode === 'MSA24'; // Debug specific product by vendorCode
            
            if (isDebugProduct) {
                console.log(`\n=== DEBUG for ${vendorCode} ===`);
                console.log('Offer params:', offer.param);
            }

            // Parse parameters
            if (offer.param) {
                const paramArray = Array.isArray(offer.param) ? offer.param : [offer.param];
                
                if (isDebugProduct) {
                    console.log(`Total params for ${vendorCode}:`, paramArray.length);
                }

                paramArray.forEach(p => {
                    if(p['@_name'] && p['#text'] != null) {
                        const rawName = String(p['@_name']).trim();
                        const rawValue = String(p['#text']).trim();
                        
                        if (isDebugProduct) {
                            console.log(`Param: "${rawName}" = "${rawValue}"`);
                        }

                        const keyNorm = rawName.toLowerCase();
                        
                        // Handle Фото1 - use as main picture
                        if (keyNorm === 'фото1') {
                            photo1 = rawValue;
                            if (isDebugProduct) {
                                console.log(`Found Фото1: ${rawValue}`);
                            }
                            return;
                        }
                        
                        // Skip unwanted parameters
                        if (['фото2', 'фото3', 'фото4', 'url', 'ссылка на qr'].includes(keyNorm)) {
                            return;
                        }
                        
                        // Save document params temporarily for pairing
                        if (keyNorm.startsWith('документы файл') || keyNorm.startsWith('документы наименование')) {
                            params[rawName] = rawValue;
                            if (isDebugProduct) {
                                console.log(`Found document param: ${rawName} = ${rawValue}`);
                            }
                            return;
                        }
                        
                        // Normalize stock-related keys
                        const key = 
                            keyNorm === 'остаток' ? 'Остаток' :
                            keyNorm === 'наличие' ? 'Остаток' :
                            keyNorm === 'quantity' ? 'Остаток' :
                            keyNorm === 'количество на складе' ? 'Остаток' :
                            keyNorm === 'склад' ? 'Остаток' :
                            keyNorm === 'stock' ? 'Остаток' :
                            rawName;
                        
                        params[key] = rawValue;
                    }
                });
            }
            
            // Parse documents - pair "Документы файл N" with "Документы наименование N"
            const docFiles = {};
            const docNames = {};
            
            if (isDebugProduct) {
                console.log(`Parsing documents for ${vendorCode}...`);
                console.log('All params:', Object.keys(params));
            }

            Object.keys(params).forEach(key => {
                const keyLower = key.toLowerCase();
                const fileMatch = keyLower.match(/документы файл (\d+)/);
                const nameMatch = keyLower.match(/документы наименование (\d+)/);
                
                if (fileMatch) {
                    const num = fileMatch[1];
                    docFiles[num] = params[key];
                    if (isDebugProduct) {
                        console.log(`Document file ${num}: ${params[key]}`);
                    }
                } else if (nameMatch) {
                    const num = nameMatch[1];
                    docNames[num] = params[key];
                    if (isDebugProduct) {
                        console.log(`Document name ${num}: ${params[key]}`);
                    }
                }
            });
            
            if (isDebugProduct) {
                console.log('docFiles:', docFiles);
                console.log('docNames:', docNames);
            }

            // Pair documents
            Object.keys(docFiles).forEach(num => {
                const url = docFiles[num];
                const name = docNames[num] || `Документ ${num}`;
                if (url && url.trim()) {
                    documents.push({ url: url.trim(), name: name.trim() });
                    if (isDebugProduct) {
                        console.log(`Added document: ${name} -> ${url}`);
                    }
                }
            });
            
            if (isDebugProduct) {
                console.log(`Final documents array for ${vendorCode}:`, documents);
                console.log(`=== END DEBUG for ${vendorCode} ===\n`);
            }

            if (offer.country_of_origin) {
                params['Страна производитель'] = offer.country_of_origin;
            }
            
            // Parse price - MUST look in offer.prices.price with type="RRC"
            let price = null;
            
            // Try nested structure: offer.prices.price
            if (offer.prices && offer.prices.price) {
                const priceArray = Array.isArray(offer.prices.price) ? offer.prices.price : [offer.prices.price];
                const rrcPrice = priceArray.find(p => p['@_type'] === 'RRC');
                if (rrcPrice) {
                    price = typeof rrcPrice === 'object' ? rrcPrice['#text'] : rrcPrice;
                    if (idx === 0) {
                        console.log(`[syncXmlFeed] Found RRC price in prices.price: ${price}`);
                    }
                } else {
                    const firstPrice = priceArray[0];
                    price = typeof firstPrice === 'object' ? firstPrice['#text'] : firstPrice;
                    if (idx === 0) {
                        console.log(`[syncXmlFeed] No RRC in prices.price, using first: ${price}`);
                    }
                }
            }
            // Fallback to flat structure: offer.price
            else if (offer.price) {
                const priceArray = Array.isArray(offer.price) ? offer.price : [offer.price];
                const rrcPrice = priceArray.find(p => p['@_type'] === 'RRC');
                if (rrcPrice) {
                    price = typeof rrcPrice === 'object' ? rrcPrice['#text'] : rrcPrice;
                    if (idx === 0) {
                        console.log(`[syncXmlFeed] Found RRC price in flat price: ${price}`);
                    }
                } else {
                    const firstPrice = priceArray[0];
                    price = typeof firstPrice === 'object' ? firstPrice['#text'] : firstPrice;
                    if (idx === 0) {
                        console.log(`[syncXmlFeed] No RRC in flat price, using first: ${price}`);
                    }
                }
            }
            
            if (idx === 0) {
                console.log(`[syncXmlFeed] Final price: ${price}`);
            }
            
            // Parse warehouse stock information
            const warehouseStock = {};
            let aggregatedStock = '';
            
            if (offer.quantity_in_stock) {
                const stockArray = Array.isArray(offer.quantity_in_stock) ? offer.quantity_in_stock : [offer.quantity_in_stock];
                stockArray.forEach(stock => {
                    const whId = stock['@_warehouse_id'];
                    const stockValue = typeof stock === 'object' ? stock['#text'] : stock;
                    if (whId && stockValue) {
                        const whName = warehouses[whId] || `Склад ${whId}`;
                        warehouseStock[whName] = String(stockValue).trim();
                        
                        if (idx === 0) {
                            console.log(`[syncXmlFeed] Warehouse ${whId} (${whName}): ${stockValue}`);
                        }
                    }
                });
                
                // Aggregate stock
                const numericStocks = Object.values(warehouseStock)
                    .map(s => {
                        const match = String(s).match(/(\d+)/);
                        return match ? parseInt(match[1], 10) : 0;
                    })
                    .filter(n => n > 0);
                
                if (numericStocks.length > 0) {
                    const totalStock = numericStocks.reduce((a, b) => a + b, 0);
                    aggregatedStock = `${totalStock} уп.`;
                } else {
                    aggregatedStock = Object.values(warehouseStock)[0] || '';
                }
            }
            
            // Save warehouse stock in params
            if (Object.keys(warehouseStock).length > 0) {
                params['Склады'] = warehouseStock;
            }
            
            // Set main stock parameter
            if (!('Остаток' in params)) {
                if (aggregatedStock) {
                    params['Остаток'] = aggregatedStock;
                } else if (String(offer['@_available'] || '').toLowerCase() === 'true') {
                    params['Остаток'] = 'в наличии';
                } else if (offer.quantity) {
                    params['Остаток'] = String(offer.quantity);
                }
            }
            
            const stockInfo = parseStock(params['Остаток'] || '');
            const numericStock = String(params['Остаток'] || '').match(/\d+/);
            const stockNumber = numericStock ? parseInt(numericStock[0], 10) : (stockInfo.inStock ? 1 : 0);
            
            params['Остаток_число'] = String(stockNumber);
            
            // Use Фото1 as picture if available, fallback to offer.picture
            let productPicture = photo1 || offer.picture;
            if (Array.isArray(productPicture)) {
                productPicture = productPicture[0]?.['#text'] || productPicture[0];
            }
            
            if (idx === 0) {
                console.log(`[syncXmlFeed] Final picture URL: ${productPicture}`);
                console.log(`[syncXmlFeed] Product name: ${offer.name}`);
                console.log(`[syncXmlFeed] Price: ${price}`);
            }

            return {
                id: offer['@_id'],
                name: offer.name || '',
                vendorCode: vendorCode,
                price: price || null,
                description: typeof offer.description === 'string' ? offer.description : '',
                url: offer.url || '',
                picture: productPicture,
                vendor: offer.vendor || '',
                params: params,
                documents: documents // Add documents array
            };
        });

        const contentForAI = products.map(p => {
            const parts = [
                `Товар: ${p.name}`,
                `Артикул: ${p.vendorCode}`,
                p.vendor ? `Производитель: ${p.vendor}` : '',
                p.price ? `Цена: ${p.price} руб/м²` : '',
                p.description ? `Описание: ${p.description}` : ''
            ];
            
            if (p.params) {
                Object.entries(p.params).forEach(([key, value]) => {
                    if (key === 'Склады' && typeof value === 'object') {
                        parts.push(`Остатки по складам:`);
                        Object.entries(value).forEach(([whName, whStock]) => {
                            parts.push(`  - ${whName}: ${whStock}`);
                        });
                    } else if (key !== 'Остаток_число' && !key.toLowerCase().startsWith('документы')) {
                        parts.push(`${key}: ${value}`);
                    }
                });
            }
            
            if (p.documents && p.documents.length > 0) {
                parts.push(`Документы:`);
                p.documents.forEach(doc => {
                    parts.push(`  - ${doc.name}: ${doc.url}`);
                });
            }
            
            return parts.filter(Boolean).join('\n');
        }).join('\n\n---\n\n');

        const updateData = {
            xml_data: {
                products: products,
                warehouses: warehouses,
                last_synced: new Date().toISOString(),
                total_products: products.length
            },
            content: contentForAI,
            last_sync: new Date().toISOString()
        };

        await base44.asServiceRole.entities.KnowledgeBase.update(knowledgeBaseId, updateData);

        console.log(`[syncXmlFeed] Successfully synced ${products.length} products`);

        return Response.json({ 
            success: true, 
            products_count: products.length,
            warehouses_count: Object.keys(warehouses).length,
            encoding: encoding
        });

    } catch (error) {
        console.error('[syncXmlFeed] Error:', error);
        return Response.json({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});