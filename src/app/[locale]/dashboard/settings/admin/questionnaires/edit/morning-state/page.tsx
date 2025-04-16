'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlusIcon, Trash2Icon, GripVerticalIcon, XIcon, Settings } from 'lucide-react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectTrigger, 
  SelectContent, 
  SelectItem, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type QuestionType = 'text' | 'radio' | 'slider' | 'multiple';

interface Option {
  id: string;
  text: string;
  value: number;
}

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options: Option[];
  minValue?: number;
  maxValue?: number;
}

export default function EditQuestionnairePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('Состояние утро');
  const [description, setDescription] = useState('Опросник для утренней оценки состояния игроков. Оценка сна, физического состояния и готовности к тренировкам.');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: 'Как вы оцениваете качество вашего сна?',
      type: 'slider',
      required: true,
      options: [],
      minValue: 1,
      maxValue: 10
    },
    {
      id: '2',
      text: 'Как вы себя чувствуете сегодня утром?',
      type: 'radio',
      required: true,
      options: [
        { id: '1', text: 'Отлично', value: 5 },
        { id: '2', text: 'Хорошо', value: 4 },
        { id: '3', text: 'Нормально', value: 3 },
        { id: '4', text: 'Устал', value: 2 },
        { id: '5', text: 'Очень устал', value: 1 },
      ]
    }
  ]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: 'Новый вопрос',
      type: 'text',
      required: true,
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(question => question.id !== id));
  };

  const updateQuestion = (id: string, updatedData: Partial<Question>) => {
    setQuestions(questions.map(question => 
      question.id === id ? { ...question, ...updatedData } : question
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(question => {
      if (question.id === questionId) {
        const newOption = { 
          id: Date.now().toString(), 
          text: 'Новый вариант', 
          value: question.options.length + 1 
        };
        return { ...question, options: [...question.options, newOption] };
      }
      return question;
    }));
  };

  const updateOption = (questionId: string, optionId: string, text: string, value: number) => {
    setQuestions(questions.map(question => {
      if (question.id === questionId) {
        const updatedOptions = question.options.map(option => 
          option.id === optionId ? { ...option, text, value } : option
        );
        return { ...question, options: updatedOptions };
      }
      return question;
    }));
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(question => {
      if (question.id === questionId) {
        return { ...question, options: question.options.filter(option => option.id !== optionId) };
      }
      return question;
    }));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setQuestions(items);
  };

  const saveQuestionnaire = () => {
    // В реальном приложении здесь будет сохранение данных на сервер
    console.log('Сохранение опросника:', { title, description, questions });
    alert('Опросник успешно сохранен!');
    // router.push('/ru/dashboard/settings/admin'); // Перенаправление после сохранения
  };

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/ru/dashboard/settings/admin"
          className="inline-flex items-center text-vista-light hover:text-vista-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          <span>Вернуться в админ-панель</span>
        </Link>
        <Button onClick={saveQuestionnaire} className="bg-vista-primary hover:bg-vista-primary/90">
          Сохранить опросник
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="bg-vista-dark border-vista-secondary/30 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-vista-light flex items-center">
              <Settings className="h-5 w-5 mr-2 text-vista-primary/80" />
              Настройка опросника
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vista-light mb-1">
                  Название опросника
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название опросника"
                  className="bg-vista-dark-secondary text-vista-light border-vista-secondary/30 focus:border-vista-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vista-light mb-1">
                  Описание опросника
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Введите описание опросника"
                  className="bg-vista-dark-secondary text-vista-light border-vista-secondary/30 focus:border-vista-primary/50"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-vista-dark border-vista-secondary/30 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-vista-light flex items-center">
              <PlusIcon className="h-5 w-5 mr-2 text-vista-primary/80" />
              Вопросы опросника
            </CardTitle>
            <Button size="sm" onClick={addQuestion} className="bg-vista-primary hover:bg-vista-primary/90">
              <PlusIcon className="h-4 w-4 mr-2" />
              Добавить вопрос
            </Button>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="questions">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-5"
                  >
                    {questions.map((question, index) => (
                      <Draggable key={question.id} draggableId={question.id} index={index}>
                        {(provided: DraggableProvided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-vista-dark-lighter border border-vista-secondary/30 rounded-lg p-5 shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div {...provided.dragHandleProps} className="cursor-grab p-1 hover:bg-vista-secondary/20 rounded">
                                <GripVerticalIcon className="h-5 w-5 text-vista-light/50" />
                              </div>
                              <div className="flex-1 mx-2">
                                <span className="text-vista-light font-medium">Вопрос {index + 1}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeQuestion(question.id)}
                                className="text-vista-error hover:bg-vista-error/10 hover:text-vista-error rounded"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-vista-light mb-1">
                                  Текст вопроса
                                </label>
                                <Textarea
                                  value={question.text}
                                  onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                                  placeholder="Введите текст вопроса"
                                  className="bg-vista-dark text-vista-light border-vista-secondary/30 focus:border-vista-primary/50"
                                  rows={2}
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-vista-light mb-1">
                                    Тип вопроса
                                  </label>
                                  <Select
                                    value={question.type}
                                    onValueChange={(value) => updateQuestion(question.id, { 
                                      type: value as QuestionType,
                                      options: value === 'slider' || value === 'text' ? [] : question.options
                                    })}
                                  >
                                    <SelectTrigger className="bg-vista-dark border-vista-secondary/30">
                                      <SelectValue placeholder="Выберите тип вопроса">
                                        {question.type === 'text' && 'Текстовый ответ'}
                                        {question.type === 'radio' && 'Один вариант ответа'}
                                        {question.type === 'multiple' && 'Несколько вариантов'}
                                        {question.type === 'slider' && 'Шкала (слайдер)'}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-vista-dark-secondary border-vista-secondary/30">
                                      <SelectItem value="text">Текстовый ответ</SelectItem>
                                      <SelectItem value="radio">Один вариант ответа</SelectItem>
                                      <SelectItem value="multiple">Несколько вариантов</SelectItem>
                                      <SelectItem value="slider">Шкала (слайдер)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-vista-light mb-1">
                                    Обязательный вопрос
                                  </label>
                                  <Select
                                    value={question.required ? 'yes' : 'no'}
                                    onValueChange={(value) => updateQuestion(question.id, { required: value === 'yes' })}
                                  >
                                    <SelectTrigger className="bg-vista-dark border-vista-secondary/30">
                                      <SelectValue placeholder="Обязательность">
                                        {question.required ? 'Да' : 'Нет'}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-vista-dark-secondary border-vista-secondary/30">
                                      <SelectItem value="yes">Да</SelectItem>
                                      <SelectItem value="no">Нет</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {question.type === 'slider' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-vista-secondary/10 rounded-md">
                                  <div>
                                    <label className="block text-sm font-medium text-vista-light mb-1">
                                      Минимальное значение
                                    </label>
                                    <Input
                                      type="number"
                                      value={question.minValue || 1}
                                      onChange={(e) => updateQuestion(question.id, { 
                                        minValue: parseInt(e.target.value) || 1 
                                      })}
                                      className="bg-vista-dark text-vista-light border-vista-secondary/30 focus:border-vista-primary/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-vista-light mb-1">
                                      Максимальное значение
                                    </label>
                                    <Input
                                      type="number"
                                      value={question.maxValue || 10}
                                      onChange={(e) => updateQuestion(question.id, { 
                                        maxValue: parseInt(e.target.value) || 10 
                                      })}
                                      className="bg-vista-dark text-vista-light border-vista-secondary/30 focus:border-vista-primary/50"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {(question.type === 'radio' || question.type === 'multiple') && (
                                <div className="p-4 bg-vista-secondary/10 rounded-md">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-vista-light">
                                      Варианты ответов
                                    </label>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => addOption(question.id)}
                                      className="border-vista-primary/40 hover:bg-vista-primary/10 text-vista-primary"
                                    >
                                      <PlusIcon className="h-3 w-3 mr-2" />
                                      Добавить вариант
                                    </Button>
                                  </div>
                                  
                                  {question.options.length === 0 ? (
                                    <p className="text-vista-light/50 text-sm italic">Нет вариантов ответа</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {question.options.map((option) => (
                                        <div key={option.id} className="flex items-center space-x-2">
                                          <Input
                                            value={option.text}
                                            onChange={(e) => updateOption(
                                              question.id, 
                                              option.id, 
                                              e.target.value, 
                                              option.value
                                            )}
                                            className="bg-vista-dark text-vista-light border-vista-secondary/30 focus:border-vista-primary/50 flex-1"
                                            placeholder="Текст варианта"
                                          />
                                          <Input
                                            type="number"
                                            value={option.value}
                                            onChange={(e) => updateOption(
                                              question.id, 
                                              option.id, 
                                              option.text, 
                                              parseInt(e.target.value) || 0
                                            )}
                                            className="bg-vista-dark text-vista-light border-vista-secondary/30 focus:border-vista-primary/50 w-20"
                                            placeholder="Вес"
                                          />
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeOption(question.id, option.id)}
                                            className="text-vista-error hover:bg-vista-error/10 hover:text-vista-error h-8 w-8"
                                          >
                                            <XIcon className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {questions.length === 0 && (
              <div className="text-center py-12 bg-vista-secondary/5 rounded-lg border border-dashed border-vista-secondary/30">
                <p className="text-vista-light/50 mb-4">Нет добавленных вопросов</p>
                <Button onClick={addQuestion} className="bg-vista-primary hover:bg-vista-primary/90">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Добавить первый вопрос
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button onClick={saveQuestionnaire} className="bg-vista-primary hover:bg-vista-primary/90 px-6">
            Сохранить опросник
          </Button>
        </div>
      </div>
    </div>
  );
} 