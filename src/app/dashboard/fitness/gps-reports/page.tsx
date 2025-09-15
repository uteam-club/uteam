'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Settings, FileText } from 'lucide-react';
import GpsProfilesTab from '@/components/gps/GpsProfilesTab';
import GpsReportsListTab from '@/components/gps/GpsReportsListTab';
import GpsAnalysisTab from '@/components/gps/GpsAnalysisTab';

export default function GpsReportsPage() {
  const [activeTab, setActiveTab] = useState('analysis');

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">GPS отчеты</CardTitle>
          <div className="w-[200px] h-9"></div> {/* Пустая кнопка для выравнивания */}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-vista-dark/30 border-vista-secondary/50">
              <TabsTrigger 
                value="analysis" 
                className="flex items-center gap-2 data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
              >
                <BarChart3 className="h-4 w-4" />
                Анализ
              </TabsTrigger>
              <TabsTrigger 
                value="profiles" 
                className="flex items-center gap-2 data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
              >
                <Settings className="h-4 w-4" />
                GPS профили
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
              >
                <FileText className="h-4 w-4" />
                Список отчетов
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-6">
              <GpsAnalysisTab />
            </TabsContent>

            <TabsContent value="profiles" className="space-y-6">
              <GpsProfilesTab />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <GpsReportsListTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
