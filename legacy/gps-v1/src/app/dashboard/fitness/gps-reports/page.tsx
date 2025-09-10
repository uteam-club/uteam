'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import GpsReportsTab from '@/components/gps/GpsReportsTab';
import GpsProfilesTab from '@/components/gps/GpsProfilesTab';
import PlayerMappingsTab from '@/components/gps/PlayerMappingsTab';

export default function GpsReportsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('reports');

  if (!session?.user) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">GPS отчеты</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Отчеты</TabsTrigger>
          <TabsTrigger value="profiles">Профили отчетов</TabsTrigger>
          <TabsTrigger value="mappings">Маппинги игроков</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-4">
          <GpsReportsTab />
        </TabsContent>
        
        <TabsContent value="profiles" className="space-y-4">
          <GpsProfilesTab />
        </TabsContent>
        
        <TabsContent value="mappings" className="space-y-4">
          <PlayerMappingsTab />
        </TabsContent>
      </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 