-- AlterEnum
ALTER TYPE "StreamType" ADD VALUE IF NOT EXISTS 'Itunes';

-- AlterTable
ALTER TABLE "Stream" ADD COLUMN "previewUrl" TEXT;
