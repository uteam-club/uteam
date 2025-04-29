'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function TestImage() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="flex flex-col items-center gap-4 p-4 border border-dashed border-gray-400 rounded">
      <h2 className="text-lg font-bold">Тестовое изображение</h2>
      
      <div className="relative h-20 w-40">
        <Image
          src="/images/vista.png"
          alt="VISTA Logo Test"
          fill
          objectFit="contain"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            console.error('Ошибка загрузки изображения:', e);
          }}
        />
      </div>
      
      <p>Статус: {isLoaded ? 'Загружено' : 'Загружается...'}</p>
      
      <div className="mt-4">
        <p className="text-sm">Прямая ссылка на изображение:</p>
        <a 
          href="/images/vista.png" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 underline text-sm"
        >
          /images/vista.png
        </a>
      </div>
    </div>
  );
} 