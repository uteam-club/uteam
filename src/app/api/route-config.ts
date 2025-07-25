import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
// Конфигурация для динамических роутов
export const routeConfig = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
  dynamic: 'force-dynamic',
  revalidate: 0,
  headers: () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
        { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
      ],
    },
  ],
}; 