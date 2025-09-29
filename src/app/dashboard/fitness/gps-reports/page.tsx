'use client';

import { useState } from 'react';
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
          <div className="grid w-full grid-cols-3 gap-2">
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
                activeTab === 'analysis'
                  ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
                  : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
              }`}
              onClick={() => setActiveTab('analysis')}
            >
              <BarChart3 className="h-4 w-4" />
              Анализ
            </Button>
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
                activeTab === 'profiles'
                  ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
                  : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
              }`}
              onClick={() => setActiveTab('profiles')}
            >
              <Settings className="h-4 w-4" />
              Профили
            </Button>
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
                activeTab === 'reports'
                  ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
                  : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
              }`}
              onClick={() => setActiveTab('reports')}
            >
              <List className="h-4 w-4" />
              Список отчетов
            </Button>
          </div>

          {/* Контент вкладок */}
          <div className="space-y-4 mt-6">
            {activeTab === 'analysis' && <GpsAnalysisTab />}
            
            {activeTab === 'profiles' && (
              <GpsProfilesList
                onCreateProfile={() => setShowNewProfileModal(true)}
                onViewProfile={(profileId) => console.log('View profile:', profileId)}
                onEditProfile={(profileId) => console.log('Edit profile:', profileId)}
                onDeleteProfile={(profileId) => console.log('Delete profile:', profileId)}
              />
            )}
            
            {activeTab === 'reports' && (
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
            )}
          </div>
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
