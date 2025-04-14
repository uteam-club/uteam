import { unstable_setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/common/Logo';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo className="h-16 mb-4" />
          <h2 className="text-center text-2xl font-bold text-vista-light">
            VISTA UTEAM
          </h2>
        </div>
        <div className="card">
          <LoginForm />
        </div>
      </div>
    </div>
  );
} 