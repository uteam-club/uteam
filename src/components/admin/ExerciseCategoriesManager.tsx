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

type ExerciseCategory = {
  id: string;
  name: string;
};

export function ExerciseCategoriesManager() {
  const t = useTranslations('admin');
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExerciseCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/exercise-categories');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных');
        }
        
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Ошибка загрузки категорий упражнений:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      setErrorMessage(t('nameRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/exercise-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка добавления категории');
      }
      
      const newCategory = await response.json();
      setCategories(prev => [...prev, newCategory]);
      setCategoryName('');
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка добавления категории:', error);
      setErrorMessage(t('errorAddingCategory'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryName.trim()) {
      setErrorMessage(t('nameRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/exercise-categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: editingCategory.id,
          name: categoryName.trim() 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка редактирования категории');
      }
      
      const updatedCategory = await response.json();
      
      setCategories(prev => 
        prev.map(category => 
          category.id === editingCategory.id 
            ? updatedCategory
            : category
        )
      );
      
      setCategoryName('');
      setEditingCategory(null);
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка редактирования категории:', error);
      setErrorMessage(t('errorEditingCategory'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/admin/exercise-categories?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка удаления категории');
      }
      
      setCategories(prev => prev.filter(category => category.id !== id));
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Ошибка удаления категории:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (category: ExerciseCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsDialogOpen(true);
  };

  if (loading && categories.length === 0) {
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
          {t('exerciseCategoriesManagement')}
        </h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingCategory(null);
                setCategoryName('');
                setErrorMessage('');
              }}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
              <Plus className="w-4 h-4 mr-2" />
              {t('addCategory')}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-vista-dark-secondary border border-vista-secondary/30">
            <DialogHeader>
              <DialogTitle className="text-vista-light">
                {editingCategory ? t('editExerciseCategory') : t('addExerciseCategory')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <Input
                value={categoryName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryName(e.target.value)}
                placeholder={t('categoryName')}
                className="bg-vista-dark border-vista-secondary/50 text-vista-light"
              />
              {errorMessage && (
                <p className="text-vista-error text-sm mt-2">{errorMessage}</p>
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
                onClick={editingCategory ? handleEditCategory : handleAddCategory}
                disabled={loading}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? t('save') : t('add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {categories.length === 0 ? (
        <div className="text-center py-10 text-vista-light/70">
          {t('noCategories')}
        </div>
      ) : (
        <div className="rounded-md border border-vista-secondary/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-vista-dark-secondary">
                <th className="text-left p-3 text-vista-light font-medium">{t('name')}</th>
                <th className="text-right p-3 w-24">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr 
                  key={category.id} 
                  className="border-t border-vista-secondary/30 hover:bg-vista-dark-secondary">
                  <td className="p-3 text-vista-light">{category.name}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
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
                          {t('categoryDeleteConfirmation', { name: category.name })}
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
                            onClick={() => handleDeleteCategory(category.id)}
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