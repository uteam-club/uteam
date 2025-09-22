// Утилиты для tree shaking и оптимизации импортов

// Оптимизированные импорты для lucide-react
export const Icons = {
  // GPS иконки
  BarChart3: () => import('lucide-react').then(m => m.BarChart3),
  Activity: () => import('lucide-react').then(m => m.Activity),
  Users: () => import('lucide-react').then(m => m.Users),
  Calendar: () => import('lucide-react').then(m => m.Calendar),
  Download: () => import('lucide-react').then(m => m.Download),
  Edit: () => import('lucide-react').then(m => m.Edit),
  Upload: () => import('lucide-react').then(m => m.Upload),
  Settings: () => import('lucide-react').then(m => m.Settings),
  Search: () => import('lucide-react').then(m => m.Search),
  Plus: () => import('lucide-react').then(m => m.Plus),
  Trash2: () => import('lucide-react').then(m => m.Trash2),
  X: () => import('lucide-react').then(m => m.X),
  ChevronRight: () => import('lucide-react').then(m => m.ChevronRight),
  ChevronLeft: () => import('lucide-react').then(m => m.ChevronLeft),
  Star: () => import('lucide-react').then(m => m.Star),
  Tag: () => import('lucide-react').then(m => m.Tag),
  Clock: () => import('lucide-react').then(m => m.Clock),
  FileText: () => import('lucide-react').then(m => m.FileText),
  ClipboardType: () => import('lucide-react').then(m => m.ClipboardType),
  GripVertical: () => import('lucide-react').then(m => m.GripVertical),
  Check: () => import('lucide-react').then(m => m.Check),
  User: () => import('lucide-react').then(m => m.User),
  MapPin: () => import('lucide-react').then(m => m.MapPin),
  RefreshCw: () => import('lucide-react').then(m => m.RefreshCw),
  Save: () => import('lucide-react').then(m => m.Save),
};

// Оптимизированные импорты для UI компонентов
export const UIComponents = {
  Button: () => import('@/components/ui/button').then(m => m.Button),
  Card: () => import('@/components/ui/card').then(m => m.Card),
  CardContent: () => import('@/components/ui/card').then(m => m.CardContent),
  CardHeader: () => import('@/components/ui/card').then(m => m.CardHeader),
  CardTitle: () => import('@/components/ui/card').then(m => m.CardTitle),
  Input: () => import('@/components/ui/input').then(m => m.Input),
  Label: () => import('@/components/ui/label').then(m => m.Label),
  Select: () => import('@/components/ui/select').then(m => m.Select),
  SelectContent: () => import('@/components/ui/select').then(m => m.SelectContent),
  SelectItem: () => import('@/components/ui/select').then(m => m.SelectItem),
  SelectTrigger: () => import('@/components/ui/select').then(m => m.SelectTrigger),
  SelectValue: () => import('@/components/ui/select').then(m => m.SelectValue),
  Table: () => import('@/components/ui/table').then(m => m.Table),
  TableBody: () => import('@/components/ui/table').then(m => m.TableBody),
  TableCell: () => import('@/components/ui/table').then(m => m.TableCell),
  TableHead: () => import('@/components/ui/table').then(m => m.TableHead),
  TableHeader: () => import('@/components/ui/table').then(m => m.TableHeader),
  TableRow: () => import('@/components/ui/table').then(m => m.TableRow),
  Badge: () => import('@/components/ui/badge').then(m => m.Badge),
  Checkbox: () => import('@/components/ui/checkbox').then(m => m.Checkbox),
  Switch: () => import('@/components/ui/switch').then(m => m.Switch),
  Textarea: () => import('@/components/ui/textarea').then(m => m.Textarea),
  Dialog: () => import('@/components/ui/dialog').then(m => m.Dialog),
  DialogContent: () => import('@/components/ui/dialog').then(m => m.DialogContent),
  DialogHeader: () => import('@/components/ui/dialog').then(m => m.DialogHeader),
  DialogTitle: () => import('@/components/ui/dialog').then(m => m.DialogTitle),
  DialogFooter: () => import('@/components/ui/dialog').then(m => m.DialogFooter),
  useToast: () => import('@/components/ui/use-toast').then(m => m.useToast),
};

// Оптимизированные импорты для GPS компонентов
export const GPSComponents = {
  GpsReportVisualization: () => import('@/components/gps/GpsReportVisualization').then(m => m.GpsReportVisualization),
  GpsReportVisualizationOptimized: () => import('@/components/gps/GpsReportVisualizationOptimized').then(m => m.GpsReportVisualizationOptimized),
  NewGpsReportModal: () => import('@/components/gps/NewGpsReportModal').then(m => m.NewGpsReportModal),
  NewGpsProfileModal: () => import('@/components/gps/NewGpsProfileModal').then(m => m.NewGpsProfileModal),
  EditGpsReportModal: () => import('@/components/gps/EditGpsReportModal').then(m => m.EditGpsReportModal),
  EditGpsProfileModal: () => import('@/components/gps/EditGpsProfileModal').then(m => m.EditGpsProfileModal),
  MetricSelector: () => import('@/components/gps/MetricSelector').then(m => m.MetricSelector),
  MetricSelectorOptimized: () => import('@/components/gps/MetricSelectorOptimized').then(m => m.MetricSelectorOptimized),
  GpsAnalysisTab: () => import('@/components/gps/GpsAnalysisTab').then(m => m.GpsAnalysisTab),
  GpsProfilesTab: () => import('@/components/gps/GpsProfilesTab').then(m => m.GpsProfilesTab),
};

// Оптимизированные импорты для утилит
export const Utils = {
  convertUnit: () => import('@/lib/unit-converter').then(m => m.convertUnit),
  formatValue: () => import('@/lib/unit-converter').then(m => m.formatValue),
  formatValueOnly: () => import('@/lib/unit-converter').then(m => m.formatValueOnly),
  getPrecision: () => import('@/lib/unit-converter').then(m => m.getPrecision),
  gpsLogger: () => import('@/lib/logger').then(m => m.gpsLogger),
  dbCache: () => import('@/lib/db-cache').then(m => m.dbCache),
  gpsCacheKeys: () => import('@/lib/db-cache').then(m => m.gpsCacheKeys),
  invalidateGpsCache: () => import('@/lib/db-cache').then(m => m.invalidateGpsCache),
};

// Функция для динамического импорта компонентов
export async function loadComponent<T>(
  componentLoader: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> {
  try {
    const componentModule = await componentLoader();
    return componentModule.default;
  } catch (error) {
    console.error('Failed to load component:', error);
    if (fallback) return fallback;
    throw error;
  }
}

// Функция для предзагрузки компонентов
export function preloadComponents(components: Array<() => Promise<any>>) {
  if (typeof window !== 'undefined') {
    components.forEach(loader => {
      loader().catch(console.error);
    });
  }
}
