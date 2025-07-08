import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';

interface Training {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
  teamId: string;
  team: string;
  categoryId: string;
  category: string;
  isCompleted?: boolean;
  type: string;
}

interface Exercise {
  id: string;
  title: string;
  description: string;
  authorId: string;
  author: {
    id: string;
    name: string;
  };
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  tags: Array<{
    id: string;
    name: string;
  }>;
  mediaItems?: Array<{
    id: string;
    url: string;
    publicUrl?: string;
    type: string;
  }>;
  position?: number;
  trainingExerciseId?: string;
  notes?: string;
}

export default function PublicTrainingPage() {
  const params = useParams();
  const trainingId = params.id as string;
  const [training, setTraining] = useState<Training | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTraining() {
      try {
        setLoading(true);
        const resp = await fetch(`/api/trainings/${trainingId}?view=public`);
        if (!resp.ok) throw new Error('Тренировка не найдена');
        const data = await resp.json();
        setTraining(data);
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки тренировки');
      } finally {
        setLoading(false);
      }
    }
    async function fetchExercises() {
      try {
        const resp = await fetch(`/api/trainings/${trainingId}/exercises?view=public`);
        if (!resp.ok) return;
        const data = await resp.json();
        setExercises(Array.isArray(data) ? data : []);
      } catch {}
    }
    fetchTraining();
    fetchExercises();
  }, [trainingId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-vista-light">Загрузка...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  if (!training) return null;

  return (
    <div className="min-h-screen bg-vista-dark text-vista-light flex flex-col items-center px-2 py-4">
      <Card className="w-full max-w-2xl mx-auto bg-vista-dark/80 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-vista-primary mb-2">{training.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center"><Tag className="h-5 w-5 mr-2 text-vista-primary" /><span>{training.category || 'Без категории'}</span></div>
            <div className="flex items-center"><Users className="h-5 w-5 mr-2 text-vista-primary" /><span>{training.team || 'Неизвестно'}</span></div>
            <div className="flex items-center"><Calendar className="h-5 w-5 mr-2 text-vista-primary" /><span>{training.date}</span></div>
            <div className="flex items-center"><Clock className="h-5 w-5 mr-2 text-vista-primary" /><span>{training.time || 'Неизвестно'}</span></div>
            {training.location && <div className="flex items-center col-span-2"><MapPin className="h-5 w-5 mr-2 text-vista-primary" /><span>{training.location}</span></div>}
          </div>
          {training.description && (
            <div className="mb-6">
              <div className="text-vista-light/70 text-sm mb-1">Описание</div>
              <div className="text-vista-light/90 whitespace-pre-line">{training.description}</div>
            </div>
          )}
          {training.notes && (
            <div className="mb-6">
              <div className="text-vista-light/70 text-sm mb-1">Примечания</div>
              <div className="text-vista-light/90 whitespace-pre-line">{training.notes}</div>
            </div>
          )}
          <Separator className="border-vista-secondary/50 my-6" />
          <div>
            <h3 className="text-vista-light text-lg mb-4">Упражнения</h3>
            {exercises.length > 0 ? (
              <div className="space-y-4">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="flex flex-col sm:flex-row rounded-md border overflow-hidden bg-vista-dark/50 border-vista-secondary/50 shadow-md">
                    <div className="sm:w-[200px] overflow-hidden bg-vista-dark/30 flex items-center justify-center">
                      {exercise.mediaItems && exercise.mediaItems.length > 0 ? (
                        <img src={exercise.mediaItems[0].publicUrl || exercise.mediaItems[0].url} alt={exercise.title} className="w-full h-full object-cover max-h-48" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-vista-light/50 min-h-[120px]">Нет изображения</div>
                      )}
                    </div>
                    <div className="flex-grow p-4">
                      <h4 className="font-medium text-vista-primary text-lg">{exercise.title}</h4>
                      <p className="text-vista-light/80 mt-1">{exercise.description || 'Без описания'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-vista-secondary/50 rounded-md text-vista-light/60">Для этой тренировки пока не добавлены упражнения</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 