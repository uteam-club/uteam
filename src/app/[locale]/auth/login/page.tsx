import { unstable_setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';
import OptimizedImage from '@/components/ui/OptimizedImage';

export const metadata: Metadata = {
  title: 'FDC VISTA | Вход в систему',
  description: 'Войдите в систему FDC VISTA для управления командой',
};

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-vista-dark">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-[120px] h-[60px]">
            <OptimizedImage 
              src="/images/vista.png" 
              alt="FDC VISTA Logo" 
              fill
              sizes="120px"
              objectFit="contain"
              priority
              quality={90}
            />
          </div>
          <h2 className="text-center text-2xl font-bold text-vista-light mt-4">
            FDC VISTA
          </h2>
        </div>
        <div className="card backdrop-blur-sm shadow-lg">
          <LoginForm />
        </div>
        
        <div className="flex justify-center mt-6">
          <div className="w-[160px] h-[60px]">
            <OptimizedImage 
              src="/images/UTEAM-03.png" 
              alt="UTEAM Logo" 
              fill
              sizes="160px"
              objectFit="contain"
              quality={90}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 