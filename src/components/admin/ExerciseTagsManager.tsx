'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ExerciseCategory = {
  id: string;
  name: string;
};

type ExerciseTag = {
  id: string;
  name: string;
  categoryId: string;
};

export function ExerciseTagsManager() {
  const t = useTranslations('admin');
  const [tags, setTags] = useState<ExerciseTag[]>([]);
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagName, setTagName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingTag, setEditingTag] = useState<ExerciseTag | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загружаем категории
        const categoriesResponse = await fetch('/api/admin/exercise-categories');
        if (!categoriesResponse.ok) {
          throw new Error('Ошибка загрузки категорий');
        }
        const categoriesData = await categoriesResponse.json();
        console.log('Загруженные категории:', categoriesData); // Для отладки
        
        // Загружаем теги
        const tagsResponse = await fetch('/api/admin/exercise-tags');
        if (!tagsResponse.ok) {
          throw new Error('Ошибка загрузки тегов');
        }
        const tagsData = await tagsResponse.json();
        
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCategoryNameById = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : t('unknown');
  };

  const handleAddTag = async () => {
    if (!tagName.trim()) {
      setErrorMessage(t('nameRequired'));
      return;
    }
    
    if (!selectedCategoryId) {
      setErrorMessage(t('categoryRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/exercise-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName.trim(),
          categoryId: selectedCategoryId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка добавления тега');
      }
      
      const newTag = await response.json();
      setTags(prev => [...prev, newTag]);
      setTagName('');
      setSelectedCategoryId('');
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка добавления тега:', error);
      setErrorMessage(t('errorAddingTag'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditTag = async () => {
    if (!editingTag || !tagName.trim()) {
      setErrorMessage(t('nameRequired'));
      return;
    }
    
    if (!selectedCategoryId) {
      setErrorMessage(t('categoryRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/exercise-tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTag.id,
          name: tagName.trim(),
          categoryId: selectedCategoryId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка редактирования тега');
      }
      
      const updatedTag = await response.json();
      
      setTags(prev => 
        prev.map(tag => 
          tag.id === editingTag.id 
            ? updatedTag 
            : tag
        )
      );
      
      setTagName('');
      setSelectedCategoryId('');
      setEditingTag(null);
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка редактирования тега:', error);
      setErrorMessage(t('errorEditingTag'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/admin/exercise-tags?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка удаления тега');
      }
      
      setTags(prev => prev.filter(tag => tag.id !== id));
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Ошибка удаления тега:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (tag: ExerciseTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setSelectedCategoryId(tag.categoryId);
    setIsDialogOpen(true);
  };

  if (loading && tags.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-vista-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-vista-light">
          {t('exerciseTagsManagement')}
        </h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingTag(null);
                setTagName('');
                setSelectedCategoryId('');
                setErrorMessage('');
              }}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
              <Plus className="w-4 h-4 mr-2" />
              {t('addTag')}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-vista-dark-secondary border border-vista-secondary/30">
            <DialogHeader>
              <DialogTitle className="text-vista-light">
                {editingTag ? t('editTag') : t('addTag')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div>
                <label htmlFor="tagName" className="block text-sm font-medium text-vista-light mb-1">
                  {t('tagName')}
                </label>
                <Input
                  id="tagName"
                  value={tagName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagName(e.target.value)}
                  placeholder={t('enterTagName')}
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light"
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-vista-light mb-1">
                  {t('category')}
                </label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={setSelectedCategoryId}
                >
                  <SelectTrigger id="category" className="bg-vista-dark border-vista-secondary/50 text-vista-light">
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark-secondary border border-vista-secondary/30">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem 
                          key={category.id} 
                          value={category.id}
                          className="text-vista-light hover:bg-vista-secondary/20 focus:bg-vista-secondary/30"
                        >
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-vista-light/50">Нет доступных категорий</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {errorMessage && (
                <p className="text-vista-error text-sm">{errorMessage}</p>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  variant="outline" 
                  className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20">
                  {t('cancel')}
                </Button>
              </DialogClose>
              <Button 
                onClick={editingTag ? handleEditTag : handleAddTag}
                disabled={loading}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTag ? t('save') : t('add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {tags.length === 0 ? (
        <div className="text-center py-10 text-vista-light/70">
          {t('noTags')}
        </div>
      ) : (
        <div className="rounded-md border border-vista-secondary/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-vista-dark-secondary">
                <th className="text-left p-3 text-vista-light font-medium">{t('name')}</th>
                <th className="text-left p-3 text-vista-light font-medium">{t('category')}</th>
                <th className="text-right p-3 w-24">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr 
                  key={tag.id} 
                  className="border-t border-vista-secondary/30 hover:bg-vista-dark-secondary">
                  <td className="p-3 text-vista-light">{tag.name}</td>
                  <td className="p-3 text-vista-light">{getCategoryNameById(tag.categoryId)}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(tag)}
                      className="h-8 w-8 mr-1 text-vista-light/70 hover:text-vista-primary hover:bg-vista-secondary/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-vista-light/70 hover:text-vista-error hover:bg-vista-secondary/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="bg-vista-dark-secondary border border-vista-secondary/30">
                        <DialogHeader>
                          <DialogTitle className="text-vista-light">
                            {t('confirmDeletion')}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-vista-light">
                          {t('tagDeleteConfirmation', { name: tag.name })}
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button 
                              variant="outline" 
                              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20">
                              {t('cancel')}
                            </Button>
                          </DialogClose>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleDeleteTag(tag.id)}
                            disabled={loading}
                            className="bg-vista-error hover:bg-vista-error/90 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('delete')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 