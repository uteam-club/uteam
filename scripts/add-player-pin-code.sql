-- Добавляем поле PIN-кода для игроков
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "pinCode" CHAR(6); 