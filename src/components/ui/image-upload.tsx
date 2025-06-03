'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CameraIcon, TrashIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadPlayerFile, deletePlayerFile } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
  avatarMode?: boolean;
  clubId?: string;
  teamId?: string;
  entityId?: string;
  entityType?: 'player' | 'coach' | 'event';
}

export default function ImageUpload({
  value,
  onChange,
  disabled,
  className,
  avatarMode = false,
  clubId,
  teamId,
  entityId,
  entityType
}: ImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Сжатие изображения перед загрузкой
  const compressImage = async (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Определяем формат для сохранения
          const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
          const mimeType = isPng ? 'image/png' : 'image/jpeg';

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Ошибка сжатия изображения'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, mimeType, quality);
        };
        img.onerror = () => reject(new Error('Ошибка загрузки изображения для сжатия'));
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    });
  };

  // Функция быстрой локальной загрузки с предпросмотром
  const handleLocalPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onChange(dataUrl); // Немедленно показываем предпросмотр
      
      // Добавляем временный тост для индикации
      toast({
        title: 'Изображение загружается',
        description: 'Пожалуйста, подождите...',
        variant: 'default',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (file: File) => {
    if (!clubId || !teamId || !entityId || !entityType) {
      toast({
        title: "Ошибка",
        description: "Не указаны необходимые параметры для загрузки",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/teams/${teamId}/players/${entityId}/upload-image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка загрузки изображения');
      }

      const data = await response.json();
      
      // Проверяем валидность URL
      if (!data.imageUrl || typeof data.imageUrl !== 'string' || !/^https?:\/\//.test(data.imageUrl)) {
        throw new Error('Получен некорректный URL изображения');
      }

      onChange(data.imageUrl);
      toast({
        title: "Успех",
        description: "Изображение успешно загружено",
        variant: "default"
      });
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      setError(error instanceof Error ? error.message : 'Ошибка загрузки изображения');
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : 'Ошибка загрузки изображения',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      // Сжимаем изображение перед загрузкой
      const compressedFile = await compressImage(file);

      await handleUpload(compressedFile);

    } catch (error) {
      console.error('ImageUpload: Ошибка при обработке файла:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Удаление изображения с сервера и сброс imageUrl
  const handleDeleteImage = async () => {
    if (!value || !clubId || !teamId || !entityId) return;
    try {
      setIsLoading(true);
      setError(null);
      // Получаем путь к файлу из URL
      const url = new URL(value);
      const path = decodeURIComponent(url.pathname.replace('/storage/v1/object/public/club-media/', ''));
      await deletePlayerFile(path);
      // Сброс imageUrl в базе (вызывается onChange(null), а родитель должен обновить профиль)
      onChange(null);
      toast({
        title: 'Фото удалено',
        description: 'Изображение успешно удалено',
        variant: 'default',
      });
    } catch (error) {
      setError('Ошибка при удалении изображения');
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить изображение',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div 
        className={cn(
          'relative',
          avatarMode ? 'mx-auto w-32 h-32 rounded-full' : 'w-full h-64 rounded-md',
          className
        )}
      >
        {value ? (
          <div className={cn(
            'relative w-full h-full overflow-hidden',
            avatarMode ? 'rounded-full' : 'rounded-md'
          )}>
            {avatarMode && (
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] z-0" />
            )}
            <img
              src={value}
              alt="Uploaded"
              className={cn(
                'w-full h-full object-cover',
                avatarMode ? 'rounded-full z-10 relative' : 'rounded-md'
              )}
              style={{ background: 'transparent' }}
              onError={(e) => {
                console.error('Ошибка загрузки изображения:', value);
                setError('Не удалось загрузить изображение');
                if (entityType === 'player') {
                  const defaultImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent('User')}&background=162a5b&color=fff&size=100`;
                  onChange(defaultImageUrl);
                  (e.target as HTMLImageElement).src = defaultImageUrl;
                }
              }}
              onLoad={() => {
                setError(null);
              }}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2 z-20">
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={triggerFileInput}
                  disabled={disabled || isLoading || isUploading}
                  className="h-8 w-8 rounded-full bg-white/50 hover:bg-white/70"
                >
                  <CameraIcon className="h-4 w-4 text-white" />
                </Button>
                <span className="text-xs text-white">Заменить</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleDeleteImage}
                  disabled={disabled || isLoading || isUploading}
                  className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-500"
                >
                  <TrashIcon className="h-4 w-4 text-white" />
                </Button>
                <span className="text-xs text-white">Удалить</span>
              </div>
            </div>
            
            {/* Индикатор загрузки */}
            {isUploading && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center border-2 border-dashed',
              'text-vista-light/60 hover:text-vista-light/80 transition-colors cursor-pointer',
              avatarMode 
                ? 'rounded-full border-vista-primary/40 hover:border-vista-primary' 
                : 'rounded-md border-vista-secondary/30 hover:border-vista-secondary/60',
              'w-full h-full bg-vista-dark/30',
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            )}
            onClick={triggerFileInput}
          >
            <CameraIcon className={cn(
              'mb-2',
              avatarMode ? 'h-10 w-10' : 'h-8 w-8'
            )} />
            <p className="text-sm">
              {avatarMode ? 'Добавить фото' : 'Добавить изображение'}
            </p>
            {(isLoading || isUploading) && <p className="text-xs mt-2">Загрузка...</p>}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isLoading || isUploading}
        />
      </div>
      
      {/* Отображение ошибки */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mt-2 p-2 bg-red-500/10 rounded">
          <AlertCircleIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
} 