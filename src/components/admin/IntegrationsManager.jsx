import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntegrationConfig } from "@/entities/IntegrationConfig";
import { QuoteShareLog } from "@/entities/QuoteShareLog";
import { SendEmail } from "@/integrations/Core";
import { toast } from "@/components/ui/use-toast";
import { Mail, MessageCircle, FileText, List } from "lucide-react";

export default function IntegrationsManager() {
  const [emailCfg, setEmailCfg] = useState(null);
  const [waCfg, setWaCfg] = useState(null);
  const [logs, setLogs] = useState([]);

  const load = async () => {
    const cfgs = await IntegrationConfig.list();
    setEmailCfg(cfgs.find(c => c.kind === "email") || { kind: "email", email: { attachPdf: false, brand: {} } });
    setWaCfg(cfgs.find(c => c.kind === "whatsapp") || { kind: "whatsapp", whatsapp: { attachPdf: false, mediaFallbackImage: true } });
    const l = await QuoteShareLog.list("-created_date", 50);
    setLogs(l);
  };

  useEffect(() => { load(); }, []);

  const saveEmail = async () => {
    if (emailCfg.id) await IntegrationConfig.update(emailCfg.id, emailCfg);
    else await IntegrationConfig.create(emailCfg);
    toast({ title: "Сохранено", description: "Настройки Email обновлены" });
    load();
  };

  const saveWa = async () => {
    if (waCfg.id) await IntegrationConfig.update(waCfg.id, waCfg);
    else await IntegrationConfig.create(waCfg);
    toast({ title: "Сохранено", description: "Настройки WhatsApp обновлены" });
    load();
  };

  const testEmail = async () => {
    try {
      await SendEmail({
        to: emailCfg?.email?.fromAddress || "test@example.com",
        subject: "Тест интеграции Email",
        body: "<b>Это тестовая отправка из админ-панели.</b>"
      });
      toast({ title: "Отправлено", description: "Тестовое письмо отправлено" });
    } catch (e) {
      toast({ title: "Ошибка", description: e?.message || "Не удалось отправить", variant: "destructive" });
    }
  };

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="email"><Mail className="w-4 h-4 mr-2" />Email</TabsTrigger>
        <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</TabsTrigger>
        <TabsTrigger value="logs"><List className="w-4 h-4 mr-2" />Журнал</TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        <Card className="bg-white/70 border-white/20">
          <CardHeader><CardTitle>Настройки Email</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>From Name</Label>
                <Input value={emailCfg?.email?.fromName || ""} onChange={(e)=>setEmailCfg({...emailCfg, email:{...emailCfg.email, fromName:e.target.value}})} />
              </div>
              <div>
                <Label>From Address</Label>
                <Input value={emailCfg?.email?.fromAddress || ""} onChange={(e)=>setEmailCfg({...emailCfg, email:{...emailCfg.email, fromAddress:e.target.value}})} />
              </div>
              <div className="md:col-span-2">
                <Label>Subject template</Label>
                <Input value={emailCfg?.email?.subjectTemplate || ""} onChange={(e)=>setEmailCfg({...emailCfg, email:{...emailCfg.email, subjectTemplate:e.target.value}})} />
              </div>
              <div className="md:col-span-2">
                <Label>HTML шаблон письма</Label>
                <Textarea rows={6} value={emailCfg?.email?.htmlTemplate || ""} onChange={(e)=>setEmailCfg({...emailCfg, email:{...emailCfg.email, htmlTemplate:e.target.value}})} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEmail}>Сохранить</Button>
              <Button variant="outline" onClick={testEmail}>Тест-отправка</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="whatsapp">
        <Card className="bg-white/70 border-white/20">
          <CardHeader><CardTitle>Настройки WhatsApp</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Провайдер</Label>
                <Input value={waCfg?.whatsapp?.provider || ""} onChange={(e)=>setWaCfg({...waCfg, whatsapp:{...waCfg.whatsapp, provider:e.target.value}})} placeholder="meta | twilio | gupshup" />
              </div>
              <div>
                <Label>Номер отправителя (E.164)</Label>
                <Input value={waCfg?.whatsapp?.senderNumber || ""} onChange={(e)=>setWaCfg({...waCfg, whatsapp:{...waCfg.whatsapp, senderNumber:e.target.value}})} />
              </div>
              <div className="md:col-span-2">
                <Label>Текстовый шаблон</Label>
                <Textarea rows={6} value={waCfg?.whatsapp?.textTemplate || ""} onChange={(e)=>setWaCfg({...waCfg, whatsapp:{...waCfg.whatsapp, textTemplate:e.target.value}})} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveWa}>Сохранить</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs">
        <Card className="bg-white/70 border-white/20">
          <CardHeader><CardTitle>Журнал отправок</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Дата</th>
                    <th className="py-2 pr-4">Канал</th>
                    <th className="py-2 pr-4">Получатель</th>
                    <th className="py-2 pr-4">Сумма</th>
                    <th className="py-2 pr-4">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-t border-slate-200/50">
                      <td className="py-2 pr-4">{new Date(log.created_date).toLocaleString()}</td>
                      <td className="py-2 pr-4">{log.channel}</td>
                      <td className="py-2 pr-4">{log.recipient}</td>
                      <td className="py-2 pr-4">{log.totalAmount?.toLocaleString('ru-RU')} {log.currency}</td>
                      <td className="py-2 pr-4">
                        <Badge className={log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}