-- AlterTable
ALTER TABLE "teams" ADD COLUMN "kerjabaik_project_id" TEXT;
ALTER TABLE "teams" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "teams_kerjabaik_project_id_key" ON "teams"("kerjabaik_project_id");
