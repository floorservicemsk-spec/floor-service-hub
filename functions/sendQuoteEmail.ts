import { createClient } from 'npm:@base44/sdk@0.1.0';
import { SendEmail } from '@/integrations/Core';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

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
        const recipientEmail = user.email; // Используем email авторизованного пользователя
        
        if (!recipientEmail) {
            return new Response(JSON.stringify({ 
                error: 'Email получателя не найден у текущего пользователя.' 
            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        const issuedAt = new Date().toLocaleString('ru-RU');

        // Простое текстовое письмо
        const emailText = `
Расчёт напольного покрытия
Floor Service Hub • ${issuedAt}

ИНФОРМАЦИЯ О КЛИЕНТЕ
Клиент: ${user.full_name || 'Не указано'}
Email: ${user.email}
Телефон: ${user.phone_number || 'Не указано'}
Город: ${user.city || 'Не указано'}

ПАРАМЕТРЫ РАСЧЁТА
Товар: ${calc.productName}
Артикул: ${calc.vendorCode}
Способ укладки: ${calc.layoutName}
Площадь помещения: ${calc.area} м²
Площадь с запасом: ${calc.areaWithReserve} м²

РАСЧЁТ СТОИМОСТИ
Необходимо упаковок: ${calc.packagesNeeded} шт
Цена за м²: ${calc.pricePerM2.toLocaleString('ru-RU')} ₽

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

        await SendEmail({
            to: recipientEmail,
            subject: `Ваш расчёт напольного покрытия - ${calc.productName}`,
            body: emailText
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Расчёт успешно отправлен на почту ${recipientEmail}` 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Email sending error:', error);
        return new Response(JSON.stringify({ 
            error: 'Не удалось отправить письмо', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});