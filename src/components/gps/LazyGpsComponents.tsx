'use client';

import { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Lazy loading для тяжелых GPS компонентов
const GpsReportVisualization = lazy(() => 
  import('./GpsReportVisualization').then(module => ({ 
    default: module.GpsReportVisualization 
  }))
);

const GpsReportVisualizationOptimized = lazy(() => 
  import('./GpsReportVisualizationOptimized').then(module => ({ 
    default: module.GpsReportVisualizationOptimized 
  }))
);

const NewGpsReportModal = lazy(() => 
  import('./NewGpsReportModal').then(module => ({ 
    default: module.NewGpsReportModal 
  }))
);

const NewGpsProfileModal = lazy(() => 
  import('./NewGpsProfileModal').then(module => ({ 
    default: module.NewGpsProfileModal 
  }))
);

const EditGpsReportModal = lazy(() => 
  import('./EditGpsReportModal').then(module => ({ 
    default: module.EditGpsReportModal 
  }))
);

const EditGpsProfileModal = lazy(() => 
  import('./EditGpsProfileModal').then(module => ({ 
    default: module.EditGpsProfileModal 
  }))
);

const GpsAnalysisTab = lazy(() => 
  import('./GpsAnalysisTab').then(module => ({ 
    default: module.GpsAnalysisTab 
  }))
);

const GpsProfilesTab = lazy(() => 
  import('./GpsProfilesTab').then(module => ({ 
    default: module.GpsProfilesTab 
  }))
);

// Компонент загрузки
const LoadingSpinner = () => (
  <Card className="bg-vista-dark border-vista-secondary/30">
    <CardContent className="flex items-center justify-center h-32">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
        <span className="text-vista-light/60 text-sm">Загрузка...</span>
      </div>
    </CardContent>
  </Card>
);

// HOC для lazy loading с fallback
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = (props: P) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  );
  
  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyComponent;
};

// Экспорт lazy компонентов
export {
  GpsReportVisualization,
  GpsReportVisualizationOptimized,
  NewGpsReportModal,
  NewGpsProfileModal,
  EditGpsReportModal,
  EditGpsProfileModal,
  GpsAnalysisTab,
  GpsProfilesTab,
  LoadingSpinner
};
