-- AlterTable
ALTER TABLE "Stream" ADD COLUMN     "artist" TEXT,
ADD COLUMN     "duration" INTEGER;

-- CreateIndex
CREATE INDEX "Stream_roomId_extractedId_idx" ON "Stream"("roomId", "extractedId");
