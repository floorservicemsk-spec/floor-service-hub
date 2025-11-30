import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Send, Mail, MessageCircle } from "lucide-react";
import { SendEmail } from "@/integrations/Core";
import { User } from "@/entities/User";
import { QuoteShareLog } from "@/entities/QuoteShareLog";
import { IntegrationConfig } from "@/entities/IntegrationConfig";

function hashPayload(obj) {
  try {
    const str = JSON.stringify(obj);
    let hash = 0, i, chr;
    if (str.length === 0) return "0";
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return String(hash);
  } catch {
    return "0";
  }
}

function buildEmailHtml(payload, cfg) {
  const brandPrimary = cfg?.email?.brand?.primary || "#111827";
  const logoUrl = cfg?.email?.brand?.logoUrl;
  const custom = cfg?.email?.htmlTemplate;

  const rows = (payload.items || []).map(item => {
    const m2Total = item.packs * item.m2PerPack;
    const subtotal = m2Total * item.unitPrice;
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.sku}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}${item.color ? `, ${item.color}` : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.unitPrice.toLocaleString('ru-RU')} ${payload.currency}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.packs}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.m2PerPack}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${m2Total}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${subtotal.toLocaleString('ru-RU')} ${payload.currency}</td>
      </tr>`;
  }).join("");

  const totals = payload.totals || {};
  const defaultHtml = `
  <div style="font-family:Inter,system-ui,sans-serif;color:#111827">
    ${logoUrl ? `<div style="margin-bottom:16px;"><img src="${logoUrl}" alt="logo" style="height:36px"/></div>` : ""}
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${brandPrimary}">Расчёт материалов</h2>
    <p style="margin:0 0 16px;color:#4b5563">Проект: ${payload.projectName || "-"}. Помещение: ${payload.roomAreaM2} м². Запас: +${payload.reservePct}% ${payload.discountPct ? `• Скидка: ${payload.discountPct}%` : ""}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Артикул</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Наименование</th>
          <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">Цена/м²</th>
          <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">Упак.</th>
          <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">м²/уп.</th>
          <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">м² всего</th>
          <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">Сумма</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:16px;">
      <div>Подытог: <b>${(totals.subtotal||0).toLocaleString('ru-RU')} ${payload.currency}</b></div>
      ${payload.discountPct ? `<div>Скидка: <b>−${(totals.discount||0).toLocaleString('ru-RU')} ${payload.currency}</b></div>` : ""}
      <div style="font-size:18px;margin-top:8px;">Итого: <b>${(totals.total||0).toLocaleString('ru-RU')} ${payload.currency}</b></div>
    </div>
    ${payload.notes ? `<p style="margin-top:12px;color:#4b5563">${payload.notes}</p>` : ""}
  </div>`;

  return custom || defaultHtml;
}

function buildWhatsAppText(payload) {
  const totals = payload.totals || {};
  const lines = [];
  lines.push(`Расчёт материалов`);
  if (payload.projectName) lines.push(`Проект: ${payload.projectName}`);
  lines.push(`Помещение: ${payload.roomAreaM2} м² • Запас: +${payload.reservePct}%${payload.discountPct ? ` • Скидка: ${payload.discountPct}%` : ""}`);
  lines.push(``);
  (payload.items || []).forEach((item) => {
    const m2Total = item.packs * item.m2PerPack;
    const subtotal = m2Total * item.unitPrice;
    lines.push(`• ${item.sku} — ${item.name}${item.color ? `, ${item.color}` : ""}`);
    lines.push(`  ${m2Total} м² (${item.packs} уп. × ${item.m2PerPack} м²), ${subtotal.toLocaleString('ru-RU')} ${payload.currency}`);
  });
  lines.push(``);
  lines.push(`Итого: ${totals.total?.toLocaleString('ru-RU') || 0} ${payload.currency}`);
  return lines.join("\n");
}

export default function ShareQuoteDialog({ trigger, payload, totals, defaultEmail }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail || "");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [attachPdf, setAttachPdf] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalPayload = useMemo(() => {
    const p = { ...payload, notes: note, clientName: name };
    const subtotal = (payload.items || []).reduce((acc, it) => acc + it.unitPrice * it.m2PerPack * it.packs, 0);
    const discount = payload.discountPct ? subtotal * (payload.discountPct / 100) : 0;
    const total = subtotal - discount;
    p.totals = { subtotal, discount, total };
    return p;
  }, [payload, note, name]);

  const sendEmailFlow = async () => {
    setLoading(true);
    try {
      const cfgs = await IntegrationConfig.filter({ kind: "email" });
      const cfg = cfgs[0];
      const subject = (cfg?.email?.subjectTemplate || "Расчёт материалов") + (finalPayload.projectName ? ` — ${finalPayload.projectName}` : "");
      const body = buildEmailHtml(finalPayload, cfg);

      await SendEmail({
        to: email,
        subject,
        body
      });

      const me = await User.me();
      await QuoteShareLog.create({
        userId: me.id,
        channel: "email",
        recipient: email,
        payloadHash: hashPayload(finalPayload),
        totalAmount: finalPayload.totals.total,
        currency: finalPayload.currency,
        projectName: finalPayload.projectName || "",
        roomAreaM2: finalPayload.roomAreaM2,
        discountPct: finalPayload.discountPct || 0,
        reservePct: finalPayload.reservePct,
        status: "success",
        providerMessageId: "core-send-email"
      });

      toast({ title: "Отправлено", description: "Письмо успешно отправлено." });
      setOpen(false);
    } catch (e) {
      toast({ title: "Ошибка отправки", description: e?.message || "Не удалось отправить письмо", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsappFlow = async () => {
    setLoading(true);
    try {
      const text = buildWhatsAppText(finalPayload);
      const encoded = encodeURIComponent(text);
      const waUrl = `https://wa.me/${phone.replace(/[^\d+]/g, "")}?text=${encoded}`;
      window.open(waUrl, "_blank");

      const me = await User.me();
      await QuoteShareLog.create({
        userId: me.id,
        channel: "whatsapp",
        recipient: phone,
        payloadHash: hashPayload(finalPayload),
        totalAmount: finalPayload.totals.total,
        currency: finalPayload.currency,
        projectName: finalPayload.projectName || "",
        roomAreaM2: finalPayload.roomAreaM2,
        discountPct: finalPayload.discountPct || 0,
        reservePct: finalPayload.reservePct,
        status: "success",
        providerMessageId: "wa-click-to-chat"
      });

      toast({ title: "Открыто в WhatsApp", description: "Сообщение сформировано, завершите отправку в приложении." });
      setOpen(false);
    } catch (e) {
      toast({ title: "Ошибка", description: "Не удалось открыть WhatsApp", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Поделиться расчётом</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="email"><Mail className="w-4 h-4 mr-2" />Email</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email получателя</Label>
                <Input placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Имя клиента (опционально)</Label>
                <Input placeholder="Иван Иванов" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Примечание (опционально)</Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="attachPdfEmail" checked={attachPdf} onCheckedChange={setAttachPdf} disabled />
                <Label htmlFor="attachPdfEmail" className="text-sm text-slate-500">Прикрепить PDF (скоро)</Label>
              </div>
            </div>
            <Button onClick={sendEmailFlow} disabled={loading || !email.includes("@")} className="bg-gradient-to-r from-[#C31E2E] to-[#940815] text-white">
              <Send className="w-4 h-4 mr-2" /> Отправить по Email
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Телефон (E.164)</Label>
                <Input placeholder="+79991234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Checkbox id="attachPdfWa" checked={attachPdf} onCheckedChange={setAttachPdf} disabled />
                <Label htmlFor="attachPdfWa" className="text-sm text-slate-500">Прикрепить PDF (скоро)</Label>
              </div>
            </div>
            <Button onClick={sendWhatsappFlow} disabled={loading || !phone} className="bg-gradient-to-r from-[#C31E2E] to-[#940815] text-white">
              <Send className="w-4 h-4 mr-2" /> Отправить в WhatsApp
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}