'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  BookOpenIcon,
  PlusIcon, 
  ChevronRightIcon,
  TagIcon,
  ArrowLeftIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

type ExerciseTag = {
  id: string;
  name: string;
};

type Exercise = {
  id: string;
  name: string;
  description?: string | null;
  difficulty: number;
  tags: ExerciseTag[];
};

type CategoryData = {
  id: string;
  name: string;
  description?: string | null;
  exercises: Exercise[];
  tags: ExerciseTag[];
  _count: {
    exercises: number;
    tags: number;
  };
};

export default function CategoryPage() {
  const { locale, categoryId } = useParams() as { locale: string; categoryId: string };
  const router = useRouter();
  const t = useTranslations('exercises');
  const common = useTranslations('common');
  
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Загрузка категории и ее упражнений
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/exercises/categories/${categoryId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push(`/${locale}/dashboard/coaching/exercises`);
            return;
          }
          throw new Error('Ошибка загрузки категории');
        }
        
        const data = await response.json();
        setCategory(data);
      } catch (error) {
        console.error('Ошибка загрузки категории:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, locale, router]);

  // Отображение во время загрузки
  if (loading) {
    return (
      <div className="container-app py-6">
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
        </div>
      </div>
    );
  }

  // Если категория не найдена
  if (!category) {
    return (
      <div className="container-app py-6">
        <div className="flex flex-col items-center justify-center h-60">
          <p className="text-vista-light/60 text-lg mb-4">Категория не найдена</p>
          <Button 
            onClick={() => router.push(`/${locale}/dashboard/coaching/exercises`)}
            variant="outline"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Вернуться к упражнениям
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <div className="mb-6">
        <Link 
          href={`/${locale}/dashboard/coaching/exercises`}
          className="inline-flex items-center text-vista-light hover:text-vista-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          <span>Вернуться к упражнениям</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-vista-primary/20 rounded-full flex items-center justify-center text-vista-primary mr-4">
            <FolderIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-vista-light">{category.name}</h1>
            {category.description && (
              <p className="text-vista-light/70 mt-1">{category.description}</p>
            )}
          </div>
        </div>
        <Button className="bg-vista-primary text-vista-dark hover:bg-vista-primary/90">
          <PlusIcon className="h-4 w-4 mr-2" /> Добавить упражнение
        </Button>
      </div>

      {category.tags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium text-vista-light mb-3">Теги</h2>
          <div className="flex flex-wrap gap-2">
            {category.tags.map(tag => (
              <span 
                key={tag.id} 
                className="inline-flex items-center px-3 py-1 rounded-full bg-vista-secondary/50 hover:bg-vista-secondary text-vista-light text-xs"
              >
                <TagIcon className="h-3 w-3 mr-1" /> {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-medium text-vista-light mb-4">
          Упражнения ({category._count.exercises})
        </h2>
        {category.exercises.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.exercises.map(exercise => (
              <Link 
                key={exercise.id}
                href={`/${locale}/dashboard/coaching/exercises/${exercise.id}`}
                className="bg-vista-secondary/50 rounded-lg p-4 hover:bg-vista-secondary/70 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-vista-primary/20 rounded-full flex items-center justify-center text-vista-primary">
                      <BookOpenIcon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-vista-light">{exercise.name}</h3>
                      {exercise.description && (
                        <p className="text-sm text-vista-light/70 mt-1 line-clamp-1">{exercise.description}</p>
                      )}
                      <div className="flex items-center mt-2">
                        <div className="flex gap-1 mr-4">
                          {[...Array(5)].map((_, i) => (
                            <span 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${i < exercise.difficulty ? 'bg-vista-primary' : 'bg-vista-light/20'}`}
                            />
                          ))}
                        </div>
                        {exercise.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {exercise.tags.slice(0, 2).map(tag => (
                              <span 
                                key={tag.id} 
                                className="text-xs text-vista-light/60 bg-vista-secondary/30 px-2 py-0.5 rounded-full"
                              >
                                {tag.name}
                              </span>
                            ))}
                            {exercise.tags.length > 2 && (
                              <span className="text-xs text-vista-light/60 px-1">
                                +{exercise.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-vista-light/50" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-vista-secondary/20 rounded-lg p-8 text-center">
            <p className="text-vista-light/60 mb-4">В этой категории еще нет упражнений</p>
            <Button className="bg-vista-primary text-vista-dark hover:bg-vista-primary/90">
              <PlusIcon className="h-4 w-4 mr-2" /> Создать первое упражнение
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 