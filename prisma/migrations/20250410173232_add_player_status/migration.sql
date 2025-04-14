-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('READY', 'REHABILITATION', 'SICK', 'STUDY', 'OTHER');

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "status" "PlayerStatus" NOT NULL DEFAULT 'READY';
