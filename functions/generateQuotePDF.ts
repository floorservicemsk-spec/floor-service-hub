import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

// Простая генерация PDF без jsPDF (который вызывает проблемы в Deno)
const generateSimplePDF = (user, calc, issuedAt) => {
    // Создаем простой текстовый документ для скачивания
    const content = `
РАСЧЁТ НАПОЛЬНОГО ПОКРЫТИЯ
Floor Service Hub • ${issuedAt}

ИНФОРМАЦИЯ О КЛИЕНТЕ
Клиент: ${user.full_name || 'Не указано'}
Email: ${user.email}
Телефон: ${user.phone_number || 'Не указано'}
Город: ${user.city || 'Не указано'}
Торговая точка: ${user.retail_point || 'Не указано'}

ПАРАМЕТРЫ РАСЧЁТА
Товар: ${calc.productName}
Артикул: ${calc.vendorCode}
Способ укладки: ${calc.layoutName}
Площадь помещения: ${calc.area} м²
Площадь с запасом: ${calc.areaWithReserve} м²

РАСЧЁТ СТОИМОСТИ
Необходимо упаковок: ${calc.packagesNeeded} шт
Цена за м²: ${calc.pricePerM2.toLocaleString('ru-RU')} ₽
Цена за упаковку: ${(calc.areaPerPackage * calc.pricePerM2).toLocaleString('ru-RU')} ₽

Базовая стоимость: ${calc.baseCost.toLocaleString('ru-RU')} ₽
${calc.discountPercent > 0 ? `Скидка (${calc.discountPercent}%): −${calc.discountValue.toLocaleString('ru-RU')} ₽` : ''}
ИТОГОВАЯ СТОИМОСТЬ: ${calc.totalCost.toLocaleString('ru-RU')} ₽

${calc.discountValue > 0 ? `
ВАША ЭКОНОМИЯ: ${calc.discountValue.toLocaleString('ru-RU')} ₽
Это ${calc.discountPercent}% от базовой стоимости товара!
` : ''}

Расчёт сформирован автоматически • Floor Service Hub
Цены и наличие товара могут изменяться
`;

    return new TextEncoder().encode(content);
};

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response('Unauthorized', { status: 401 });
        }
        
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        
        const user = await base44.auth.me();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const calc = await req.json();
        const issuedAt = new Date().toLocaleString('ru-RU');

        const textBytes = generateSimplePDF(user, calc, issuedAt);

        return new Response(textBytes, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'attachment; filename="raschet-napolnogo-pokrytiya.txt"'
            }
        });

    } catch (error) {
        console.error('PDF Generation Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});