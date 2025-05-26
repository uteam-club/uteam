'use client';

import { useEffect, useState, useRef } from 'react';
import { MUSCLE_NAMES } from '@/lib/constants';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

interface BodyMapProps {
  view: 'front' | 'back';
  selectedAreas: string[];
  painLevels?: Record<string, number>;
  onAreaSelect: (area: string, muscleName: string, painLevel?: number) => void;
}

const SVG_PATHS = {
  front: '/male-front.svg',
  back: '/male-back.svg',
};

const PAIN_LEVEL_COLORS = {
  1: 'bg-lime-300',  // желто-зеленый
  2: 'bg-lime-400',
  3: 'bg-yellow-300',
  4: 'bg-yellow-400',
  5: 'bg-yellow-500',
  6: 'bg-orange-400',
  7: 'bg-orange-500',
  8: 'bg-red-400',
  9: 'bg-red-500',
  10: 'bg-red-600',
} as const;

const SVG_LEVEL_COLORS = {
  1: '#84cc16',  // lime-300
  2: '#65a30d',  // lime-400
  3: '#fde047',  // yellow-300
  4: '#facc15',  // yellow-400
  5: '#eab308',  // yellow-500
  6: '#fb923c',  // orange-400
  7: '#f97316',  // orange-500
  8: '#f87171',  // red-400
  9: '#ef4444',  // red-500
  10: '#dc2626', // red-600
} as const;

// Номера элементов, которые не должны быть интерактивными
const NON_INTERACTIVE_ELEMENTS = [1, 2];

function BodyMapComponent({ view, selectedAreas, painLevels = {}, onAreaSelect }: BodyMapProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [showPainLevel, setShowPainLevel] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{ id: string; name: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Загружаем SVG и добавляем базовые стили для path
  useEffect(() => {
    fetch(SVG_PATHS[view])
      .then(res => res.text())
      .then(svg => {
        // Добавляем стили для всех path
        const modifiedSvg = svg.replace(/<svg([^>]*)>/, (match, attrs) => {
          // Добавляем стили в начало SVG
          return `<svg${attrs}>
            <style>
              path { cursor: default; }
              path[id^="_"] { cursor: pointer; }
              path[id^="_"]:not(.non-interactive):hover { fill-opacity: 0.5; }
              .non-interactive { pointer-events: none; }
              .cls-1 { fill: #3f3f3f; }
              .cls-2 { fill: #707070; }
              .cls-3 { fill: #bebdbe; }
            </style>`;
        });
        setSvgContent(modifiedSvg);
      });
  }, [view]);

  // Добавляем номера после рендеринга SVG
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Очищаем старые номера
    const oldNumbers = svgElement.querySelectorAll('.muscle-number, .muscle-number-outline');
    oldNumbers.forEach(num => num.remove());

    // Находим все интерактивные области
    const paths = Array.from(svgElement.querySelectorAll('path')).filter(path => 
      path.id && path.id.startsWith('_') && !path.classList.contains('cls-3') && !path.classList.contains('cls-2')
    );
    
    paths.forEach((path, index) => {
      const muscleNumber = index + 3;
      const muscleId = `muscle-${muscleNumber}`;
      
      if (NON_INTERACTIVE_ELEMENTS.includes(muscleNumber)) {
        path.classList.add('non-interactive');
        return;
      }

      // Сохраняем оригинальный ID и присваиваем новый
      path.setAttribute('data-original-id', path.id);
      path.id = muscleId;

      // Подсвечиваем выбранные области с учетом уровня боли
      if (selectedAreas.includes(muscleId)) {
        const painLevel = painLevels[muscleId];
        if (painLevel) {
          path.style.fill = SVG_LEVEL_COLORS[painLevel as keyof typeof SVG_LEVEL_COLORS];
          path.style.fillOpacity = '0.5';
        }
      }
    });
  }, [svgContent, selectedAreas, painLevels]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as SVGElement;
    if (target.tagName.toLowerCase() === 'path' && target.id && !target.classList.contains('non-interactive')) {
      const muscleName = MUSCLE_NAMES[view][target.id as keyof typeof MUSCLE_NAMES[typeof view]] || '';
      
      // Если область уже выбрана, удаляем её
      if (selectedAreas.includes(target.id)) {
        onAreaSelect(target.id, muscleName);
      } else {
        // Если область не выбрана, показываем диалог выбора уровня боли
        setSelectedArea({ id: target.id, name: muscleName });
        setShowPainLevel(true);
      }
    }
  }

  function handlePainLevelSelect(level: number) {
    if (selectedArea) {
      onAreaSelect(selectedArea.id, selectedArea.name, level);
      setShowPainLevel(false);
      setSelectedArea(null);
    }
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative mx-auto w-72 bg-vista-dark/30 rounded-lg overflow-visible"
        onClick={handleClick}
      >
        {svgContent && (
          <div
            className="w-full h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {showPainLevel && selectedArea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[90%] max-w-md p-6 bg-vista-dark text-white shadow-xl border border-vista-light/20">
            <h3 className="text-lg font-semibold mb-6 text-center">
              Выберите уровень боли для области:<br/>
              <span className="text-vista-light">{selectedArea.name}</span>
            </h3>
            <div className="flex gap-1 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <button
                  key={level}
                  onClick={() => handlePainLevelSelect(level)}
                  className={`${PAIN_LEVEL_COLORS[level as keyof typeof PAIN_LEVEL_COLORS]} 
                    w-9 h-9 rounded-md text-white font-medium shadow-md 
                    transition-transform active:scale-95 text-sm flex items-center justify-center`}
                >
                  {level}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setShowPainLevel(false)}
              variant="outline"
              className="w-full border-vista-light/20 text-vista-light hover:bg-vista-light/10 hover:text-white"
            >
              Отмена
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

// Экспортируем компонент с отключенным SSR
export const BodyMap = dynamic(() => Promise.resolve(BodyMapComponent), {
  ssr: false
}); 