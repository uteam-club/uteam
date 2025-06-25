'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CameraIcon, TrashIcon, AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface ImageUploadProps {
  teamId: string;
  playerId: string;
  clubId: string;
  imageUrl?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function ImageUpload({ teamId, playerId, clubId, imageUrl, onChange, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/teams/${teamId}/players/${playerId}/upload-image?clubId=${clubId}`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      onChange(data.imageUrl);
    } else {
      const err = await res.json().catch(() => ({}));
      toast({
        title: "Ошибка",
        description: 'Ошибка загрузки: ' + (err.error || res.status),
        variant: "destructive"
      });
    }
  };

  const handleDelete = () => {
    // Просто сбрасываем imageUrl, удаление файла реализовано на сервере при загрузке нового
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className={cn(
        'relative',
        'w-full h-full'
      )}>
        {imageUrl ? (
          <div className={cn(
            'relative w-full h-full overflow-hidden'
          )}>
            <img
              src={imageUrl}
              alt="avatar"
              className={cn(
                'w-full h-full min-w-full min-h-full max-w-none object-cover object-bottom',
                'z-10 relative'
              )}
              style={{ background: 'transparent' }}
              onError={(e) => {
                console.error('Ошибка загрузки изображения:', imageUrl);
                onChange(null);
              }}
              onLoad={() => {
                // No need to set error here, as we handle it in the handleDelete function
              }}
            />
            <div className="absolute inset-0 z-20"></div>
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center border-2 border-dashed',
              'text-vista-light/60 hover:text-vista-light/80 transition-colors cursor-pointer',
              'border-vista-primary/40 hover:border-vista-primary',
              'w-full h-full bg-vista-dark/30',
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            )}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <CameraIcon className={cn(
              'mb-2',
              'h-10 w-10'
            )} />
            <p className="text-sm">
              Добавить фото
            </p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    </div>
  );
} 