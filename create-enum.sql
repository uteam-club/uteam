BEGIN;

-- Добавляем временную колонку для хранения данных
ALTER TABLE "training_participants" ADD COLUMN "temp_status" TEXT;

-- Копируем данные в временную колонку
UPDATE "training_participants" SET "temp_status" = "attendanceStatus"::TEXT;

-- Удаляем старую колонку с enum
ALTER TABLE "training_participants" DROP COLUMN "attendanceStatus";

-- Создаем новый тип enum
DROP TYPE IF EXISTS "AttendanceStatus";
CREATE TYPE "AttendanceStatus" AS ENUM ('TRAINED', 'REHABILITATION', 'SICK', 'STUDY', 'OTHER');

-- Добавляем новую колонку с правильным enum и устанавливаем данные из временной колонки
ALTER TABLE "training_participants" ADD COLUMN "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'TRAINED';

-- Обновляем данные, преобразуя их в новые значения enum
UPDATE "training_participants" SET "attendanceStatus" = 
  CASE 
    WHEN LOWER("temp_status") = 'trained' THEN 'TRAINED'::"AttendanceStatus"
    WHEN LOWER("temp_status") = 'rehabilitation' THEN 'REHABILITATION'::"AttendanceStatus"
    WHEN LOWER("temp_status") = 'rehab' THEN 'REHABILITATION'::"AttendanceStatus"
    WHEN LOWER("temp_status") = 'sick' THEN 'SICK'::"AttendanceStatus"
    WHEN LOWER("temp_status") = 'study' THEN 'STUDY'::"AttendanceStatus"
    WHEN LOWER("temp_status") = 'other' THEN 'OTHER'::"AttendanceStatus"
    ELSE 'TRAINED'::"AttendanceStatus"
  END;

-- Удаляем временную колонку
ALTER TABLE "training_participants" DROP COLUMN "temp_status";

COMMIT; 