'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
export default function DocumentUpload({ onUpload, onDelete, documentType, documentName, documentId, isUploaded = false, disabled = false, className }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const handleFileChange = async (e) => {
        var _a;
        const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        try {
            setIsLoading(true);
            setError(null);
            await onUpload(file);
        }
        catch (error) {
            console.error('Ошибка при загрузке документа:', error);
            setError(error.message || 'Не удалось загрузить документ');
        }
        finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const handleDelete = async () => {
        if (!onDelete)
            return;
        try {
            setIsDeleting(true);
            setError(null);
            await onDelete();
        }
        catch (error) {
            console.error('Ошибка при удалении документа:', error);
            setError(error.message || 'Не удалось удалить документ');
        }
        finally {
            setIsDeleting(false);
        }
    };
    const triggerFileInput = () => {
        var _a;
        (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click();
    };
    return (<div className={cn("space-y-2", className)}>
      <div className={cn("flex items-center p-3 bg-vista-dark/30 border rounded-md", isUploaded
            ? "border-green-500/30 bg-green-500/10"
            : "border-vista-secondary/30 hover:border-vista-secondary/50", disabled ? "opacity-50 cursor-not-allowed" : "")}>
        <div className="flex-1 mr-2">
          <div className="flex items-center">
            <FileIcon className="h-4 w-4 text-vista-light/60 mr-2"/>
            <span className="text-vista-light/90 text-sm">
              {isUploaded ? (documentName || 'Документ загружен') : documentType}
            </span>
          </div>
          {error && (<p className="text-xs text-red-500 mt-1">{error}</p>)}
        </div>
        
        <div className="flex gap-2">
          {isUploaded && onDelete && (<Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={disabled || isLoading || isDeleting} className="h-8 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10">
              {isDeleting ? 'Удаление...' : 'Удалить'}
              {!isDeleting && <TrashIcon className="ml-1 h-4 w-4"/>}
            </Button>)}
          
          <Button type="button" variant="ghost" size="sm" onClick={triggerFileInput} disabled={disabled || isLoading || isDeleting} className={cn("h-8 text-xs", isUploaded ? "text-green-400 hover:text-green-500 hover:bg-green-500/10" : "")}>
            {isLoading ? 'Загрузка...' : isUploaded ? 'Обновить' : 'Загрузить'}
            {!isLoading && <PlusIcon className="ml-1 h-4 w-4"/>}
          </Button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={disabled || isLoading || isDeleting} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"/>
    </div>);
}
