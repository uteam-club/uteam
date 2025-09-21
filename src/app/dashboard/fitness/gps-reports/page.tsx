'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart3, Settings, List, Plus, Upload, Activity, Users, Calendar, Eye, Edit, Trash2, Download, Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NewGpsReportModal } from '@/components/gps/NewGpsReportModal';
import { NewGpsProfileModal } from '@/components/gps/NewGpsProfileModal';
import { GpsReportsList } from '@/components/gps/GpsReportsList';
import { GpsProfilesList } from '@/components/gps/GpsProfilesList';
import { GpsAnalysisTab } from '@/components/gps/GpsAnalysisTab';
import { GpsReportHistoryModal } from '@/components/gps/GpsReportHistoryModal';
import { EditGpsReportModal } from '@/components/gps/EditGpsReportModal';

export default function GpsReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('analysis');
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [selectedReportName, setSelectedReportName] = useState<string>('');

  return (
    <div className="space-y-6 pb-8">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light text-xl font-semibold">
            GPS Отчеты
          </CardTitle>
          <Button 
            variant="outline"
            onClick={() => activeTab === 'profiles' ? setShowNewProfileModal(true) : setShowNewReportModal(true)}
            className="w-full sm:w-[200px] bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-2 font-normal text-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {activeTab === 'profiles' ? 'Создать профиль' : 'Новый отчет'}
          </Button>
        </CardHeader>
        <CardContent>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-vista-dark/30 border-vista-secondary/30">
              <TabsTrigger 
                value="analysis" 
                className="flex items-center gap-2 data-[state=active]:bg-vista-primary/15 data-[state=active]:text-vista-light data-[state=active]:border-vista-primary data-[state=active]:border data-[state=inactive]:text-vista-light/60 data-[state=inactive]:hover:text-vista-light data-[state=inactive]:hover:bg-vista-dark/50"
              >
                <BarChart3 className="h-4 w-4" />
                Анализ
              </TabsTrigger>
              <TabsTrigger 
                value="profiles" 
                className="flex items-center gap-2 data-[state=active]:bg-vista-primary/15 data-[state=active]:text-vista-light data-[state=active]:border-vista-primary data-[state=active]:border data-[state=inactive]:text-vista-light/60 data-[state=inactive]:hover:text-vista-light data-[state=inactive]:hover:bg-vista-dark/50"
              >
                <Settings className="h-4 w-4" />
                Профили
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 data-[state=active]:bg-vista-primary/15 data-[state=active]:text-vista-light data-[state=active]:border-vista-primary data-[state=active]:border data-[state=inactive]:text-vista-light/60 data-[state=inactive]:hover:text-vista-light data-[state=inactive]:hover:bg-vista-dark/50"
              >
                <List className="h-4 w-4" />
                Список отчетов
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-4">
              <GpsAnalysisTab />
            </TabsContent>

            <TabsContent value="profiles" className="space-y-4">
              <GpsProfilesList
                onCreateProfile={() => setShowNewProfileModal(true)}
                onViewProfile={(profileId) => console.log('View profile:', profileId)}
                onEditProfile={(profileId) => console.log('Edit profile:', profileId)}
                onDeleteProfile={(profileId) => console.log('Delete profile:', profileId)}
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <GpsReportsList
                onEditReport={(reportId) => {
                  setSelectedReportId(reportId);
                  setEditModalOpen(true);
                }}
                onDeleteReport={(reportId) => console.log('Delete report:', reportId)}
                onViewHistory={(reportId, reportName) => {
                  setSelectedReportId(reportId);
                  setSelectedReportName(reportName);
                  setHistoryModalOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Модалы */}
      <NewGpsReportModal
        isOpen={showNewReportModal}
        onClose={() => setShowNewReportModal(false)}
        onSuccess={() => {
          setShowNewReportModal(false);
          // Здесь можно добавить обновление данных
        }}
      />

      <NewGpsProfileModal
        isOpen={showNewProfileModal}
        onClose={() => setShowNewProfileModal(false)}
        onSuccess={() => {
          setShowNewProfileModal(false);
          // Здесь можно добавить обновление данных
        }}
      />

      <GpsReportHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        reportId={selectedReportId}
        reportName={selectedReportName}
      />

      <EditGpsReportModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        reportId={selectedReportId}
      />
    </div>
  );
}
