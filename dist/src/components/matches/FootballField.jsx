var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
// Карта формаций с расположением игроков
export const formationPositions = {
    // 11×11 формации
    '1-5-2-3': [
        { x: 50, y: 90, isGoalkeeper: true }, // Вратарь всегда на одной позиции
        { x: 20, y: 75 }, { x: 35, y: 75 }, { x: 50, y: 75 }, { x: 65, y: 75 }, { x: 80, y: 75 }, // 5 защитников
        { x: 35, y: 55 }, { x: 65, y: 55 }, // 2 полузащитника
        { x: 20, y: 35 }, { x: 50, y: 35 }, { x: 80, y: 35 } // 3 нападающих
    ],
    '1-5-3-2': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 35, y: 75 }, { x: 50, y: 75 }, { x: 65, y: 75 }, { x: 80, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 35, y: 35 }, { x: 65, y: 35 }
    ],
    '1-4-5-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 20, y: 55 }, { x: 35, y: 55 }, { x: 50, y: 55 }, { x: 65, y: 55 }, { x: 80, y: 55 },
        { x: 50, y: 30 }
    ],
    '1-4-1-4-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 50, y: 60 },
        { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
        { x: 50, y: 25 }
    ],
    '1-4-4-2': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 35, y: 30 }, { x: 65, y: 30 }
    ],
    '1-4-2-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 35, y: 60 }, { x: 65, y: 60 },
        { x: 20, y: 45 }, { x: 50, y: 45 }, { x: 80, y: 45 },
        { x: 50, y: 25 }
    ],
    '1-4-3-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 20, y: 30 }, { x: 50, y: 30 }, { x: 80, y: 30 }
    ],
    '1-3-4-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 20, y: 30 }, { x: 50, y: 30 }, { x: 80, y: 30 }
    ],
    '1-3-4-1-2': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 50, y: 40 },
        { x: 35, y: 25 }, { x: 65, y: 25 }
    ],
    '1-3-4-2-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 35, y: 35 }, { x: 65, y: 35 },
        { x: 50, y: 20 }
    ],
    // 10×10 формации
    '1-4-4-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 50, y: 30 }
    ],
    '1-4-3-2': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 35, y: 35 }, { x: 65, y: 35 }
    ],
    '1-4-2-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 35, y: 55 }, { x: 65, y: 55 },
        { x: 20, y: 35 }, { x: 50, y: 35 }, { x: 80, y: 35 }
    ],
    '1-4-1-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 50, y: 60 },
        { x: 25, y: 45 }, { x: 50, y: 45 }, { x: 75, y: 45 },
        { x: 50, y: 25 }
    ],
    '1-3-4-2': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 35, y: 35 }, { x: 65, y: 35 }
    ],
    '1-3-3-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 }
    ],
    '1-3-2-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 35, y: 60 }, { x: 65, y: 60 },
        { x: 25, y: 45 }, { x: 50, y: 45 }, { x: 75, y: 45 },
        { x: 50, y: 25 }
    ],
    // 9×9 формации
    '1-4-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 50, y: 30 }
    ],
    '1-3-4-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 20, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 80, y: 55 },
        { x: 50, y: 30 }
    ],
    '1-3-3-2': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 35, y: 35 }, { x: 65, y: 35 }
    ],
    '1-3-2-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 35, y: 55 }, { x: 65, y: 55 },
        { x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 }
    ],
    '1-3-1-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 50, y: 60 },
        { x: 25, y: 45 }, { x: 50, y: 45 }, { x: 75, y: 45 },
        { x: 50, y: 25 }
    ],
    // 8×8 формации
    '1-4-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 }
    ],
    '1-4-2-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
        { x: 35, y: 55 }, { x: 65, y: 55 },
        { x: 50, y: 35 }
    ],
    '1-3-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 },
        { x: 50, y: 30 }
    ],
    '1-3-1-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 50, y: 60 },
        { x: 25, y: 40 }, { x: 50, y: 40 }, { x: 75, y: 40 }
    ],
    '1-3-1-2-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 },
        { x: 50, y: 60 },
        { x: 35, y: 45 }, { x: 65, y: 45 },
        { x: 50, y: 25 }
    ],
    // 7×7 формации
    '1-3-3': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 },
        { x: 25, y: 40 }, { x: 50, y: 40 }, { x: 75, y: 40 }
    ],
    '1-3-2-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 },
        { x: 35, y: 50 }, { x: 65, y: 50 },
        { x: 50, y: 30 }
    ],
    '1-2-3-1': [
        { x: 50, y: 90, isGoalkeeper: true },
        { x: 35, y: 70 }, { x: 65, y: 70 },
        { x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 },
        { x: 50, y: 30 }
    ]
};
const FootballField = ({ formation, colorValue, onPositionsChange, savedPositions, players = [], // По умолчанию пустой массив
onPlayerAssigned, matchId }) => {
    const [positions, setPositions] = useState([]);
    const [selectedPositionIndex, setSelectedPositionIndex] = useState(null);
    const dropdownRef = useRef(null);
    // Получаем более темный цвет для вратаря
    const getGoalkeeperColor = (colorHex) => {
        if (colorHex.startsWith('#')) {
            // Преобразуем hex в RGB
            const r = parseInt(colorHex.substring(1, 3), 16);
            const g = parseInt(colorHex.substring(3, 5), 16);
            const b = parseInt(colorHex.substring(5, 7), 16);
            // Делаем цвет на 40% темнее
            const darkerR = Math.floor(r * 0.6);
            const darkerG = Math.floor(g * 0.6);
            const darkerB = Math.floor(b * 0.6);
            return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
        }
        return colorHex;
    };
    // Закрытие выпадающего списка при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setSelectedPositionIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    // Эффект для загрузки начальных позиций при первом рендере или смене формации
    useEffect(() => {
        // Если formationPositions имеет данные для указанной формации
        if (formation && formationPositions[formation]) {
            if (savedPositions && savedPositions.length > 0) {
                // Если есть сохраненные позиции, используем их
                console.log("Установка сохраненных позиций:", savedPositions);
                setPositions(savedPositions);
            }
            else {
                // Иначе используем значения по умолчанию из формации
                console.log("Установка дефолтных позиций для формации:", formation);
                setPositions(formationPositions[formation]);
                // Уведомляем родительский компонент о дефолтных позициях
                if (onPositionsChange) {
                    onPositionsChange(formationPositions[formation]);
                }
            }
        }
    }, [formation, savedPositions]);
    // Обработчик клика на позицию
    const handlePositionClick = (index) => {
        console.log(`Клик по позиции ${index}, текущие данные:`, positions[index]);
        setSelectedPositionIndex(selectedPositionIndex === index ? null : index);
    };
    // Обработчик выбора игрока
    const handlePlayerSelect = (playerId, playerNumber, firstName, lastName) => {
        if (selectedPositionIndex === null) {
            console.error("Не выбрана позиция для игрока");
            return;
        }
        console.log(`Привязка игрока к позиции: ID=${playerId}, номер=${playerNumber}, позиция=${selectedPositionIndex}`);
        // Формируем сокращенное имя (Фамилия И.)
        const playerName = `${lastName} ${firstName.charAt(0)}.`;
        // Обновляем позиции с новыми данными игрока
        const updatedPositions = positions.map((pos, idx) => {
            if (idx === selectedPositionIndex) {
                console.log(`Обновляем данные для позиции ${idx}:`, { playerId, playerNumber, playerName });
                return Object.assign(Object.assign({}, pos), { playerId,
                    playerNumber,
                    playerName });
            }
            return pos;
        });
        // Устанавливаем новые позиции
        console.log("Новые позиции после привязки:", updatedPositions);
        setPositions(updatedPositions);
        // Оповещаем родительский компонент об изменении позиций
        if (onPositionsChange) {
            console.log("Отправляем обновленные позиции в родительский компонент");
            console.log("Детальные данные новых позиций:", JSON.stringify(updatedPositions));
            onPositionsChange(updatedPositions);
        }
        // Вызываем обработчик привязки игрока
        if (onPlayerAssigned) {
            console.log(`Вызываем onPlayerAssigned(${selectedPositionIndex}, ${playerId})`);
            onPlayerAssigned(selectedPositionIndex, playerId);
        }
        // Закрываем выпадающий список
        setSelectedPositionIndex(null);
    };
    // Обработчик отвязки игрока
    const handleRemovePlayer = (index) => {
        console.log(`Удаление игрока с позиции ${index}`);
        // Сохраняем ID удаляемого игрока для вызова onPlayerAssigned
        const removedPlayerId = positions[index].playerId;
        // Удаляем данные игрока из позиции
        const updatedPositions = positions.map((pos, idx) => {
            if (idx === index) {
                // Копируем все свойства, кроме игрока
                const { playerId, playerNumber, playerName } = pos, positionOnly = __rest(pos, ["playerId", "playerNumber", "playerName"]);
                return positionOnly;
            }
            return pos;
        });
        console.log("Позиции после удаления игрока:", updatedPositions);
        setPositions(updatedPositions);
        // Оповещаем родительский компонент
        if (onPositionsChange) {
            console.log("Отправляем обновленные позиции в родительский компонент");
            console.log("Детальные данные позиций после удаления:", JSON.stringify(updatedPositions));
            onPositionsChange(updatedPositions);
        }
        // Вызываем обработчик отвязки игрока
        if (onPlayerAssigned && removedPlayerId && removedPlayerId !== null) {
            console.log(`Вызываем onPlayerAssigned(${index}, null)`);
            onPlayerAssigned(index, null);
        }
        // Закрываем выпадающий список
        setSelectedPositionIndex(null);
    };
    // Получаем список доступных игроков (не привязанных к позициям)
    const getAvailablePlayers = () => {
        console.log("Получение доступных игроков. Всего игроков:", (players === null || players === void 0 ? void 0 : players.length) || 0);
        // Собираем ID всех привязанных игроков
        const assignedPlayerIds = positions
            .filter(pos => pos.playerId !== undefined && pos.playerId !== null)
            .map(pos => pos.playerId);
        console.log("ID привязанных игроков:", assignedPlayerIds);
        // Фильтруем список, оставляя только стартеров, не привязанных к позициям
        const availablePlayers = (players === null || players === void 0 ? void 0 : players.filter(player => player.isStarter && !assignedPlayerIds.includes(player.id))) || [];
        console.log("Доступные игроки:", availablePlayers.map(p => `${p.lastName} (${p.id})`));
        return availablePlayers;
    };
    // Проверка наличия игрока на позиции
    const hasPlayerAssigned = (position) => {
        return position.playerId !== undefined &&
            position.playerId !== null &&
            position.playerNumber !== undefined &&
            position.playerNumber !== null;
    };
    return (<div className="relative">
      <img src="/pitch.png" alt="Футбольное поле" className="w-full h-auto"/>
      
      {positions.map((position, index) => (<div key={index} className="absolute" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
          {/* Кружок игрока */}
          <div className={cn("rounded-full border border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center", selectedPositionIndex === index ? "ring-2 ring-blue-500" : "")} style={{
                width: '34px',
                height: '34px',
                backgroundColor: position.isGoalkeeper ? getGoalkeeperColor(colorValue) : colorValue,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            }} onClick={() => handlePositionClick(index)}>
            {/* Номер игрока внутри кружка */}
            {position.playerNumber && (<span className="text-xs font-bold text-white">
                {position.playerNumber}
              </span>)}
          </div>

          {/* Имя игрока под кружком */}
          {position.playerName && (<div className="absolute text-xs text-white bg-black bg-opacity-50 px-1 rounded transform -translate-x-1/2 whitespace-nowrap z-10" style={{
                    top: '20px',
                }}>
              {position.playerName}
            </div>)}

          {/* Выпадающий список */}
          {selectedPositionIndex === index && (<div ref={dropdownRef} className="absolute z-20 bg-slate-800 border border-slate-600/30 rounded shadow-lg p-2 transform -translate-x-1/2" style={{
                    top: '30px',
                    minWidth: '180px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.3)'
                }}>
              {hasPlayerAssigned(position) ? (
                // Если игрок уже привязан, показываем кнопку удаления
                <button className="w-full text-left px-2 py-1 text-red-400 hover:bg-slate-700 rounded flex items-center" onClick={() => handleRemovePlayer(index)}>
                  <span className="w-4 h-4 mr-1.5">✕</span>
                  Убрать игрока
                </button>) : (
                // Если игрок не привязан, показываем список доступных игроков
                <>
                  <div className="font-semibold text-sm px-2 py-1 border-b border-slate-600/30 text-white">
                    Выберите игрока
                  </div>
                  <div className="mt-1">
                    {getAvailablePlayers().length > 0 ? (getAvailablePlayers().map(player => (<div key={player.id} className="px-2 py-1 hover:bg-slate-700 cursor-pointer rounded text-sm text-white" onClick={() => {
                            console.log('Клик по игроку в списке:', player);
                            handlePlayerSelect(player.id, player.number, player.firstName, player.lastName);
                        }}>
                          <span className="font-semibold mr-1 text-blue-400">#{player.number}</span>
                          {player.lastName} {player.firstName.charAt(0)}.
                        </div>))) : (<div className="px-2 py-1 text-gray-400 text-sm">
                        Нет доступных игроков
                      </div>)}
                  </div>
                </>)}
            </div>)}
        </div>))}
    </div>);
};
export default FootballField;
