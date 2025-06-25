'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  onUpload: (file: File, type: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  documentType: string;
  documentName?: string;
  documentId?: string;
  isUploaded?: boolean;
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
  buttonWidth?: string;
}

export default function DocumentUpload({
  onUpload,
  onDelete,
  documentType,
  documentName,
  documentId,
  isUploaded = false,
  disabled = false,
  className,
  buttonLabel,
  buttonWidth = '120px',
}: DocumentUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      await onUpload(file, documentType);
    } catch (error: any) {
      console.error('Ошибка при загрузке документа:', error);
      setError(error.message || 'Не удалось загрузить документ');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsDeleting(true);
      setError(null);
      
      await onDelete();
      
    } catch (error: any) {
      console.error('Ошибка при удалении документа:', error);
      setError(error.message || 'Не удалось удалить документ');
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {isUploaded ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled || isLoading || isDeleting}
          className={cn(
            "w-full h-10 flex items-center justify-center gap-2 border rounded-md transition-colors",
            "border-green-500/30 bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30",
            (disabled || isLoading || isDeleting) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <TrashIcon className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-500 font-medium">
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </span>
        </button>
      ) : (
        <div
          className={cn(
            "flex items-center h-10 px-3 bg-vista-dark/30 border border-vista-secondary/30 rounded-md cursor-pointer select-none transition-colors",
            "border-vista-secondary/30 hover:border-vista-secondary/50 hover:bg-vista-secondary/10",
            disabled ? "opacity-50 cursor-not-allowed" : ""
          )}
          style={{ minWidth: buttonWidth, maxWidth: buttonWidth }}
          onClick={disabled || isLoading || isDeleting ? undefined : triggerFileInput}
          tabIndex={0}
          role="button"
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ' ') && !(disabled || isLoading || isDeleting)) {
              triggerFileInput();
            }
          }}
        >
          <FileIcon className="h-4 w-4 text-vista-light/60 mr-1 flex-shrink-0" />
          <span className="text-vista-light/90 text-xs truncate">
            {isLoading ? 'Загрузка...' : buttonLabel || 'Загрузить'}
          </span>
          {error && (
            <p className="text-xs text-red-500 mt-1 ml-2">{error}</p>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isLoading || isDeleting}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
      />
    </div>
  );
} 