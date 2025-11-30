import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building, History } from 'lucide-react';
import ProfileDetails from '../components/profile/ProfileDetails';
import LegalEntityManager from '../components/profile/LegalEntityManager';
import OrderHistory from '../components/profile/OrderHistory';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#C31E2E] to-[#940815] bg-clip-text text-transparent">
            Личный кабинет
          </h1>
          <p className="text-slate-600 mt-1">Управляйте вашими данными, юридическими лицами и заказами</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-xl rounded-xl shadow-sm p-1 mb-6">
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C31E2E] data-[state=active]:to-[#940815] data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg">
              <User className="w-4 h-4 mr-2" />
              Личные данные
            </TabsTrigger>
            <TabsTrigger value="legal-entities" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C31E2E] data-[state=active]:to-[#940815] data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg">
              <Building className="w-4 h-4 mr-2" />
              Юр. лица
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C31E2E] data-[state=active]:to-[#940815] data-[state=active]:text-white data-[state=active]:shadow-md py-3 rounded-lg">
              <History className="w-4 h-4 mr-2" />
              История заказов
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <ProfileDetails />
          </TabsContent>
          
          <TabsContent value="legal-entities">
            <LegalEntityManager />
          </TabsContent>

          <TabsContent value="orders">
            <OrderHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}