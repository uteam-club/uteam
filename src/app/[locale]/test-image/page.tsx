'use client';

import TestImage from '@/components/ui/TestImage';
import OptimizedImage from '@/components/ui/OptimizedImage';

export default function TestImagePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Тестирование изображений</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Использование Next Image напрямую:</h2>
          <TestImage />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Использование OptimizedImage компонента:</h2>
          <div className="p-4 border border-dashed border-gray-400 rounded">
            <OptimizedImage
              src="/images/vista.png"
              alt="VISTA Logo через OptimizedImage"
              width={200}
              height={100}
              objectFit="contain"
              priority
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Оптимизированный вариант (меньший размер):</h2>
          <div className="p-4 border border-dashed border-gray-400 rounded">
            <OptimizedImage
              src="/images/optimized/vista-small.png"
              alt="VISTA Logo оптимизированный"
              width={200}
              height={100}
              objectFit="contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
} 