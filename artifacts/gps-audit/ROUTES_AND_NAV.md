# GPS Routes and Navigation Audit

## API Routes

### GPS Reports API
- **POST** `/api/gps-reports` - Upload and process GPS report
- **GET** `/api/gps-reports` - List GPS reports (with filters)
- **GET** `/api/gps-reports/[id]` - Get specific GPS report
- **DELETE** `/api/gps-reports/[id]` - Delete GPS report
- **POST** `/api/gps-reports/[id]/process` - Process GPS report data
- **POST** `/api/gps-reports/recalculate` - Recalculate canonical data
- **POST** `/api/gps-reports/fix-canonical` - Fix canonical data issues
- **POST** `/api/gps-reports/extract-players` - Extract players from GPS data
- **GET** `/api/gps-reports/debug` - Debug GPS reports
- **GET** `/api/gps-reports/diag` - Diagnostic information
- **GET** `/api/debug/gps-reports/[id]` - Debug specific GPS report

### GPS Profiles API
- **GET** `/api/gps-profiles` - List GPS profiles
- **POST** `/api/gps-profiles` - Create GPS profile
- **GET** `/api/gps-profiles/[id]` - Get specific GPS profile
- **PUT** `/api/gps-profiles/[id]` - Update GPS profile
- **DELETE** `/api/gps-profiles/[id]` - Delete GPS profile
- **GET** `/api/gps-profiles/[id]/usage` - Get profile usage count
- **GET** `/api/gps-profiles/templates` - Get profile templates
- **POST** `/api/gps-profiles/parse-excel` - Parse Excel file for profile creation

### Public GPS API
- **GET** `/api/public/gps-reports/[token]` - Public access to GPS report

### Canonical API
- **GET** `/api/canonical/metrics` - Get canonical metrics registry

### Cleanup API
- **POST** `/api/clean-gps-data` - Clean GPS data

## UI Pages and Routes

### Main GPS Pages
- `/dashboard/fitness/gps-reports` - Main GPS reports page
- `/dashboard/fitness/gps-reports?teamId=X&eventType=Y&eventId=Z` - Filtered GPS reports

### Debug Pages
- `/debug-gps` - GPS debug page
- `/clean-gps` - GPS cleanup page
- `/dev/gps-report/[id]` - Development GPS report page

### Public Pages
- `/public/gps-report/[token]` - Public GPS report view

### Test Pages
- `/test-public-link` - Test public GPS report links

## Navigation Integration

### TopBar Navigation
Located in `src/components/layout/TopBar.tsx`:

```typescript
// Main navigation item
{ 
  key: 'fitness', 
  label: t('topbar.fitness'), 
  href: '/dashboard/fitness', 
  icon: <Dumbbell className="w-4 h-4 text-vista-primary flex-shrink-0" />, 
  hasDropdown: true, 
  dropdownItems: [
    { key: 'fitness-tests', label: t('dropdown.fitness_tests'), href: '/dashboard/analytics/fitness-tests' },
    { key: 'gps-reports', label: t('dropdown.gps_reports'), href: '/dashboard/fitness/gps-reports' },
  ] 
}

// Active state detection
if (dropdownItem.href === '/dashboard/fitness/gps-reports') {
  return pathname === dropdownItem.href || pathname.startsWith('/dashboard/fitness/gps-reports');
}
```

### Localization Keys
Located in `src/locales/`:

**Russian (`ru/translation.json`):**
- `"gps_reports": "GPS Отчеты"`
- `"gps_profiles": "GPS Профили"`
- `"gps_report": "GPS отчет"`

**English (`en/translation.json`):**
- `"gps_reports": "GPS Reports"`
- `"gps_profiles": "GPS Profiles"`
- `"gps_report": "GPS report"`

## Component Integration

### GPS Components Used in Other Areas
- **PlayerGameModelModal** (`src/components/players/PlayerGameModelModal.tsx`):
  - Fetches GPS profiles: `fetch('/api/gps-profiles')`
  - Integrates GPS data with player game models

### Cross-References
- **Matches page** (`src/app/dashboard/coaching/matches/[id]/page.tsx`):
  - References GPS reports for match analysis
  - Uses `GpsReportModal` component

## External Dependencies

### Database Tables
- `GpsReport` - Main GPS reports table
- `GpsProfile` - GPS visualization profiles
- `GpsMetric` - GPS metrics definitions

### File Storage
- GPS report files stored in `/gps-reports/{clubId}/{timestamp}-{filename}`

### Cache Invalidation
- `revalidatePath("/dashboard/fitness/gps-reports")` - Invalidates GPS reports page cache
- `revalidateTag("gps-events:{teamId}:{eventType}")` - Tag-based cache invalidation (commented out)

## Security Considerations

### Authentication
- All API routes require authentication via NextAuth
- Public routes use token-based access

### Authorization
- Club-based access control
- Team-based data filtering
- User permission checks

## Migration Impact

### High Impact Routes (Core Functionality)
- `/api/gps-reports` - Main upload/processing endpoint
- `/dashboard/fitness/gps-reports` - Main UI page
- `/api/gps-profiles` - Profile management

### Medium Impact Routes (Supporting Features)
- `/api/gps-reports/recalculate` - Data recalculation
- `/api/gps-reports/fix-canonical` - Data repair
- `/debug-gps` - Debug functionality

### Low Impact Routes (Development/Testing)
- `/dev/gps-report/[id]` - Development pages
- `/test-public-link` - Test functionality
- `/api/debug/gps-reports/[id]` - Debug endpoints
