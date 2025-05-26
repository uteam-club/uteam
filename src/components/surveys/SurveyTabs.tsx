"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export function SurveyTabs() {
  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">Настройка</TabsTrigger>
        <TabsTrigger value="analysis">Анализ</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-2xl font-bold mb-4 text-vista-light">Настройки опросника</h2>
          {/* Здесь будет компонент настроек */}
        </Card>
      </TabsContent>
      
      <TabsContent value="analysis">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-2xl font-bold mb-4 text-vista-light">Анализ ответов</h2>
          {/* Здесь будет компонент анализа */}
        </Card>
      </TabsContent>
    </Tabs>
  );
} 