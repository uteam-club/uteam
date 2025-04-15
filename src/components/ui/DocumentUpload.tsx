import React from 'react';
import { DocumentIcon, ArrowUpTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface DocumentUploadProps {
  title: string;
  documentUrl?: string | null;
  documentName?: string | null;
  documentSize?: number | null;
  onUploadClick: () => void;
  onDeleteClick: () => void;
  isUploading: boolean;
}

// Форматирование размера файла
const formatFileSize = (size: number | null | undefined) => {
  if (!size) return '';
  if (size < 1024) return `${size} байт`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
};

// Определение типа файла по URL или имени
const getFileType = (url?: string | null, name?: string | null): 'pdf' | 'image' | 'unknown' => {
  if (!url && !name) return 'unknown';
  
  // Проверка по расширению в URL или имени файла
  const filename = url || name || '';
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return 'image';
  
  // Если не удалось определить по расширению, проверяем имя файла
  if (filename.includes('.pdf')) return 'pdf';
  
  // По умолчанию считаем PDF (т.к. это официальный документ чаще всего)
  return 'pdf';
};

export default function DocumentUpload({
  title,
  documentUrl,
  documentName,
  documentSize,
  onUploadClick,
  onDeleteClick,
  isUploading
}: DocumentUploadProps) {
  const fileType = getFileType(documentUrl, documentName);
  
  return (
    <div className="p-4 bg-vista-dark-lighter rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-vista-light font-medium">{title}</h4>
        {!documentUrl ? (
          <button 
            onClick={onUploadClick}
            disabled={isUploading}
            className="bg-vista-primary text-vista-dark px-3 py-1 rounded flex items-center gap-1 hover:bg-vista-primary/90 transition-colors disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span>Загрузить</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onDeleteClick}
              className="bg-vista-error text-vista-light px-3 py-1 rounded hover:bg-vista-error/90 transition-colors"
            >
              Удалить
            </button>
          </div>
        )}
      </div>
      
      {documentUrl ? (
        <div className="flex items-center gap-2 p-2 bg-vista-dark rounded">
          {fileType === 'pdf' ? (
            <DocumentIcon className="h-6 w-6 text-vista-light" />
          ) : (
            <PhotoIcon className="h-6 w-6 text-vista-light" />
          )}
          <div className="flex-grow overflow-hidden">
            <p className="text-vista-light text-sm truncate">
              {documentName || title}
            </p>
            <p className="text-vista-light/60 text-xs">
              {formatFileSize(documentSize)}
            </p>
          </div>
          <a 
            href={documentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-vista-primary text-sm hover:underline"
          >
            Просмотр
          </a>
        </div>
      ) : (
        <p className="text-vista-light/60 text-sm">Документ не загружен</p>
      )}

      {isUploading && (
        <div className="mt-2">
          <div className="h-1 w-full bg-vista-dark rounded-full overflow-hidden">
            <div className="h-full bg-vista-primary animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <p className="text-vista-light/60 text-xs mt-1">Загрузка...</p>
        </div>
      )}
    </div>
  );
} 