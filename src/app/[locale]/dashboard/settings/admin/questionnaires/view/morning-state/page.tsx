'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import styles from './page.module.css';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PainArea = {
  id: string;
  name: string;
  level: number;
  pathId?: string;
};

type BodyView = 'front' | 'back';

// Карта анатомических областей с соответствующими названиями
const bodyPartsMap = {
  front: [
    { id: 'head', name: 'Голова', number: 1 },
    { id: 'neck', name: 'Шея', number: 2 },
    { id: 'chest', name: 'Грудь', number: 3 },
    { id: 'leftShoulder', name: 'Левое плечо', number: 4 },
    { id: 'rightShoulder', name: 'Правое плечо', number: 5 },
    { id: 'leftArm', name: 'Левая рука', number: 6 },
    { id: 'rightArm', name: 'Правая рука', number: 7 },
    { id: 'abs', name: 'Пресс', number: 8 },
    { id: 'leftThigh', name: 'Левое бедро', number: 9 },
    { id: 'rightThigh', name: 'Правое бедро', number: 10 },
    { id: 'leftCalf', name: 'Левая голень', number: 11 },
    { id: 'rightCalf', name: 'Правая голень', number: 12 },
  ],
  back: [
    { id: 'backHead', name: 'Затылок', number: 13 },
    { id: 'backNeck', name: 'Задняя часть шеи', number: 14 },
    { id: 'upperBack', name: 'Верхняя часть спины', number: 15 },
    { id: 'midBack', name: 'Средняя часть спины', number: 16 },
    { id: 'lowerBack', name: 'Поясница', number: 17 },
    { id: 'leftBackShoulder', name: 'Левое плечо (сзади)', number: 18 },
    { id: 'rightBackShoulder', name: 'Правое плечо (сзади)', number: 19 },
    { id: 'leftBackArm', name: 'Левая рука (сзади)', number: 20 },
    { id: 'rightBackArm', name: 'Правая рука (сзади)', number: 21 },
    { id: 'glutes', name: 'Ягодицы', number: 22 },
    { id: 'leftBackThigh', name: 'Левое бедро (сзади)', number: 23 },
    { id: 'rightBackThigh', name: 'Правое бедро (сзади)', number: 24 },
    { id: 'leftBackCalf', name: 'Левая голень (сзади)', number: 25 },
    { id: 'rightBackCalf', name: 'Правая голень (сзади)', number: 26 },
  ]
};

export default function ViewQuestionnairePage() {
  const router = useRouter();
  const svgContainerRef = React.useRef<HTMLDivElement>(null);
  
  const [sleepDuration, setSleepDuration] = useState<string>('8');
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [mood, setMood] = useState<number>(7);
  const [recovery, setRecovery] = useState<number>(7);
  const [hasPain, setHasPain] = useState<string>('');
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  
  // Мобильная адаптация
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Загрузка SVG файла
  useEffect(() => {
    const loadSvg = async () => {
      try {
        const response = await fetch(`/images/male-${bodyView}.svg`);
        const svgText = await response.text();
        // Set svgContent to svgText
      } catch (error) {
        console.error('Ошибка загрузки SVG:', error);
      }
    };
    
    loadSvg();
  }, [bodyView]);

  // Хук для обработки SVG после загрузки
  useEffect(() => {
    if (svgContainerRef.current) {
      // Даем немного времени для рендеринга SVG
      setTimeout(() => {
        // Находим изображение SVG
        const svgElement = document.querySelector(`img[src="/images/male-${bodyView}.svg"]`);
        if (svgElement) {
          // Загружаем SVG как XML
          fetch(`/images/male-${bodyView}.svg`)
            .then(response => response.text())
            .then(svgText => {
              // Создаем SVG элемент из текста
              const parser = new DOMParser();
              const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
              const svgNode = svgDoc.documentElement;
              
              // Устанавливаем атрибуты для правильного отображения
              svgNode.setAttribute('width', '100%');
              svgNode.setAttribute('height', '100%');
              svgNode.id = 'bodyMapSvg';
              
              // Заменяем img тег на SVG элемент
              svgElement.parentNode?.replaceChild(svgNode, svgElement);
              
              // Находим все пути в SVG
              const paths = svgNode.querySelectorAll('path');
              console.log(`Found ${paths.length} paths in SVG`);
              
              paths.forEach((path, index) => {
                const zoneId = `zone-${index}`;
                path.setAttribute('data-zone-id', zoneId);
                path.style.cursor = 'pointer';
                path.style.transition = 'fill 0.3s ease';
                
                path.addEventListener('mouseenter', () => {
                  if (!painAreas.includes(zoneId)) {
                    path.style.fill = '#ff9900';
                  }
                });
                
                path.addEventListener('mouseleave', () => {
                  if (!painAreas.includes(zoneId)) {
                    path.style.fill = '';
                  }
                });
                
                path.addEventListener('click', () => {
                  setPainAreas(prevAreas => {
                    if (prevAreas.includes(zoneId)) {
                      return prevAreas.filter(id => id !== zoneId);
                    } else {
                      const zoneName = bodyPartsMap[bodyView].find(part => part.id === zoneId)?.name || `Зона ${index+1}`;
                      return [...prevAreas, zoneId];
                    }
                  });
                  
                  // Обновляем стиль при клике
                  if (painAreas.includes(zoneId)) {
                    path.style.fill = '';
                  } else {
                    path.style.fill = '#ff0000';
                  }
                });
              });
            })
            .catch(error => console.error('Ошибка загрузки SVG:', error));
        }
      }, 200);
    }
  }, [bodyView]);

  // Проверка, заполнены ли все обязательные поля
  const isFormValid = () => {
    if (!sleepDuration || !sleepQuality || !mood || !recovery || !hasPain) {
      return false;
    }
    
    if (hasPain === 'yes' && painAreas.length === 0) {
      return false;
    }
    
    return true;
  };

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Заполните все поля анкеты');
      return;
    }

    try {
      toast.success('Утренний статус успешно отправлен');
      // Reset form after submission
      setSleepDuration('8');
      setSleepQuality(7);
      setMood(7);
      setRecovery(7);
      setHasPain('');
      setPainAreas([]);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Ошибка при отправке данных');
    }
  };

  // Переключение вида тела (спереди/сзади)
  const toggleBodyView = () => {
    setBodyView(bodyView === 'front' ? 'back' : 'front');
    setPainAreas([]);
    setHoveredPart(null);
  };

  // Получение активной части карты тела
  const getActiveBodyParts = () => {
    return bodyPartsMap[bodyView];
  };

  // Parse and display selected pain areas
  const selectedPainAreasText = painAreas.map((area) => {
    const [_, name] = area.split(':');
    return name;
  }).join(', ');

  const removePainArea = (areaToRemove: string) => {
    setPainAreas(painAreas.filter(area => area !== areaToRemove));
  };

  return (
    <div className={`${isMobile ? 'px-4' : 'max-w-2xl mx-auto'} py-6`}>
      <div className="mb-6">
        <Link
          href="/ru/dashboard/settings/admin"
          className="inline-flex items-center text-vista-light hover:text-vista-primary transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          <span>Вернуться в админ-панель</span>
        </Link>
      </div>

      <div className="space-y-6 mb-24">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-vista-light mb-2">Состояние утро</h1>
          <p className="text-vista-light/70">Опросник для утренней оценки состояния игроков. Оценка сна, физического состояния и готовности к тренировкам.</p>
        </div>
        
        {/* 1. Длительность сна */}
        <Card className="bg-vista-dark border-vista-secondary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-vista-light font-medium text-lg">
                  1. Длительность сна
                </span>
                <span className="text-vista-primary ml-1">*</span>
              </div>
              
              <div className="w-full">
                <Select value={sleepDuration} onValueChange={setSleepDuration}>
                  <SelectTrigger className="bg-vista-dark-secondary border-vista-secondary/30 w-full">
                    <SelectValue placeholder="Выберите количество часов" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    {Array.from({ length: 15 }, (_, i) => (
                      <SelectItem key={i} value={(i + 3).toString()}>
                        {i + 3} {(i + 3) === 1 ? 'час' : (i + 3) >= 2 && (i + 3) <= 4 ? 'часа' : 'часов'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 2. Качество сна */}
        <Card className="bg-vista-dark border-vista-secondary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-vista-light font-medium text-lg">
                  2. Качество сна
                </span>
                <span className="text-vista-primary ml-1">*</span>
              </div>
              
              <div className="space-y-4">
                <Slider 
                  value={[sleepQuality]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value: number[]) => setSleepQuality(value[0])}
                  className="my-6"
                />
                <div className="flex justify-between text-sm text-vista-light/70">
                  <span>1 - Ужасно</span>
                  <span>10 - Идеально</span>
                </div>
                <div className="text-center text-vista-primary font-bold text-xl">
                  {sleepQuality}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 3. Настроение */}
        <Card className="bg-vista-dark border-vista-secondary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-vista-light font-medium text-lg">
                  3. Настроение
                </span>
                <span className="text-vista-primary ml-1">*</span>
              </div>
              
              <div className="space-y-4">
                <Slider 
                  value={[mood]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value: number[]) => setMood(value[0])}
                  className="my-6"
                />
                <div className="flex justify-between text-sm text-vista-light/70">
                  <span>1 - Плохое</span>
                  <span>10 - Отличное</span>
                </div>
                <div className="text-center text-vista-primary font-bold text-xl">
                  {mood}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 4. Чувство восстановленности */}
        <Card className="bg-vista-dark border-vista-secondary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-vista-light font-medium text-lg">
                  4. Чувство восстановленности
                </span>
                <span className="text-vista-primary ml-1">*</span>
              </div>
              
              <div className="space-y-4">
                <Slider 
                  value={[recovery]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value: number[]) => setRecovery(value[0])}
                  className="my-6"
                />
                <div className="flex justify-between text-sm text-vista-light/70">
                  <span>1 - Не восстановился</span>
                  <span>10 - Полностью восстановился</span>
                </div>
                <div className="text-center text-vista-primary font-bold text-xl">
                  {recovery}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 5. Наличие боли */}
        <Card className="bg-vista-dark border-vista-secondary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-vista-light font-medium text-lg">
                  5. Есть ли болевые ощущения?
                </span>
                <span className="text-vista-primary ml-1">*</span>
              </div>
              
              <RadioGroup
                value={hasPain}
                onValueChange={setHasPain}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 bg-vista-secondary/10 p-3 rounded-md">
                  <RadioGroupItem id="pain-yes" value="yes" />
                  <Label 
                    htmlFor="pain-yes"
                    className="flex-1 cursor-pointer text-vista-light"
                  >
                    Да
                  </Label>
                </div>
                <div className="flex items-center space-x-2 bg-vista-secondary/10 p-3 rounded-md">
                  <RadioGroupItem id="pain-no" value="no" />
                  <Label 
                    htmlFor="pain-no"
                    className="flex-1 cursor-pointer text-vista-light"
                  >
                    Нет
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
        
        {/* Дополнительный раздел при наличии боли */}
        {hasPain === 'yes' && (
          <Card className="bg-vista-dark border-vista-secondary/30">
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-vista-light">
                <AlertTriangleIcon className="h-5 w-5 mr-2 text-vista-warning" />
                Укажите зоны боли
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Переключатель вида тела */}
              <div className="flex justify-center mb-4">
                <div className="flex p-1 bg-vista-secondary/20 rounded-md space-x-1">
                  <button
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      bodyView === 'front'
                        ? 'bg-vista-primary text-vista-dark'
                        : 'bg-transparent text-vista-light hover:bg-vista-secondary/30'
                    }`}
                    onClick={toggleBodyView}
                  >
                    Вид спереди
                  </button>
                  <button
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      bodyView === 'back'
                        ? 'bg-vista-primary text-vista-dark'
                        : 'bg-transparent text-vista-light hover:bg-vista-secondary/30'
                    }`}
                    onClick={toggleBodyView}
                  >
                    Вид сзади
                  </button>
                </div>
              </div>

              {/* Интерактивная карта тела */}
              <div className="relative flex justify-center p-4 bg-vista-dark-lighter rounded-md">
                <div className="h-96 md:h-[400px] w-full flex justify-center items-center relative" ref={svgContainerRef}>
                  <div className="relative h-full max-w-[280px]">
                    <div className="h-full w-full flex items-center justify-center">
                      <object 
                        data={`/images/male-${bodyView}.svg`}
                        type="image/svg+xml"
                        className="max-h-[380px] h-auto w-auto object-contain"
                        id="bodyMapSvg"
                        onLoad={(e) => {
                          console.log("SVG loaded:", bodyView);
                          const svg = e.currentTarget;
                          const svgDoc = svg.contentDocument;
                          if (svgDoc) {
                            console.log("SVG document accessed");
                            
                            // Используем все пути, группы и фигуры как интерактивные элементы
                            const zones = Array.from(svgDoc.querySelectorAll('path, circle, ellipse, rect, polygon'));
                            console.log(`Found ${zones.length} potential interactive elements`);
                            
                            // Фильтруем только видимые элементы с заливкой или обводкой
                            const interactiveZones = zones.filter(zone => {
                              const computedStyle = window.getComputedStyle(zone as Element);
                              const fill = computedStyle.fill;
                              const stroke = computedStyle.stroke;
                              const visibility = computedStyle.visibility;
                              const display = computedStyle.display;
                              
                              return (
                                visibility !== 'hidden' && 
                                display !== 'none' && 
                                (fill !== 'none' || stroke !== 'none')
                              );
                            });
                            
                            console.log(`After filtering: ${interactiveZones.length} interactive zones`);
                            
                            interactiveZones.forEach((zone, index) => {
                              // Безопасное приведение типа к SVGElement
                              const svgZone = zone as SVGElement;
                              const zoneId = `zone-${index+1}`; // Используем 1-indexed для пользователя
                              
                              console.log(`Setting up zone ${zoneId}`);
                              
                              svgZone.setAttribute('data-zone-id', zoneId);
                              svgZone.setAttribute('id', zoneId);
                              svgZone.style.cursor = 'pointer';
                              svgZone.style.transition = 'fill 0.3s ease';
                              
                              // Сохраняем оригинальные стили
                              const originalFill = svgZone.getAttribute('fill') || '';
                              const originalOpacity = svgZone.getAttribute('opacity') || '1';
                              
                              svgZone.setAttribute('data-original-fill', originalFill);
                              svgZone.setAttribute('data-original-opacity', originalOpacity);
                              
                              // Добавляем порядковый номер в виде атрибута
                              svgZone.setAttribute('data-number', String(index + 1));
                              
                              // Добавляем номер в виде текста в центр зоны
                              try {
                                // Приводим к SVGGraphicsElement для доступа к getBBox
                                const svgGraphicsElement = svgZone as unknown as SVGGraphicsElement;
                                const bbox = svgGraphicsElement.getBBox();
                                
                                if (bbox.width > 10 && bbox.height > 10) { // Пропускаем слишком маленькие элементы
                                  const text = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text");
                                  text.setAttribute("x", String(bbox.x + bbox.width / 2));
                                  text.setAttribute("y", String(bbox.y + bbox.height / 2));
                                  text.setAttribute("text-anchor", "middle");
                                  text.setAttribute("dominant-baseline", "middle");
                                  text.setAttribute("fill", "white");
                                  text.setAttribute("font-size", "10");
                                  text.setAttribute("pointer-events", "none");
                                  text.textContent = String(index + 1);
                                  text.setAttribute("class", "zone-label");
                                  text.setAttribute("data-for-zone", zoneId);
                                  if (svgZone.parentNode) {
                                    svgZone.parentNode.appendChild(text);
                                  }
                                }
                              } catch (error) {
                                console.error("Error adding number to zone:", error, zoneId);
                              }
                              
                              // Hover эффект
                              svgZone.addEventListener('mouseenter', () => {
                                console.log(`Hover on zone ${zoneId}`);
                                if (!painAreas.includes(zoneId)) {
                                  svgZone.setAttribute('fill', '#ff9900');
                                  svgZone.setAttribute('opacity', '0.8');
                                }
                              });
                              
                              svgZone.addEventListener('mouseleave', () => {
                                console.log(`Hover out zone ${zoneId}`);
                                if (!painAreas.includes(zoneId)) {
                                  const origFill = svgZone.getAttribute('data-original-fill') || '';
                                  const origOpacity = svgZone.getAttribute('data-original-opacity') || '1';
                                  svgZone.setAttribute('fill', origFill);
                                  svgZone.setAttribute('opacity', origOpacity);
                                }
                              });
                              
                              // Click эффект
                              svgZone.addEventListener('click', () => {
                                console.log(`Click on zone ${zoneId}`);
                                const isSelected = painAreas.includes(zoneId);
                                setPainAreas(prevAreas => {
                                  if (isSelected) {
                                    return prevAreas.filter(id => id !== zoneId);
                                  } else {
                                    return [...prevAreas, zoneId];
                                  }
                                });
                                
                                // Обновляем стиль при клике
                                if (isSelected) {
                                  const origFill = svgZone.getAttribute('data-original-fill') || '';
                                  const origOpacity = svgZone.getAttribute('data-original-opacity') || '1';
                                  svgZone.setAttribute('fill', origFill);
                                  svgZone.setAttribute('opacity', origOpacity);
                                } else {
                                  svgZone.setAttribute('fill', '#ff0000');
                                  svgZone.setAttribute('opacity', '0.8');
                                }
                              });
                            });
                          } else {
                            console.error("Could not access SVG document");
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Список выбранных зон */}
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Выбранные зоны:</h3>
                {painAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {painAreas.map((area) => {
                      const [id, name] = area.split(':');
                      return (
                        <div key={area} className="bg-vista-light px-3 py-1 rounded-full flex items-center">
                          <span>{name}</span>
                          <button
                            type="button"
                            className="ml-2 text-vista-dark hover:text-vista-primary"
                            onClick={() => removePainArea(area)}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">Зоны не выбраны</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-vista-dark border-t border-vista-secondary/30">
          <Button 
            onClick={handleSubmit} 
            className="w-full bg-vista-primary hover:bg-vista-primary/90"
            disabled={!isFormValid()}
          >
            {isFormValid() ? (
              <span className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Отправить ответы
              </span>
            ) : 'Заполните все поля'}
          </Button>
        </div>
      </div>
    </div>
  );
} 