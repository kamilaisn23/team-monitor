-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "kerjabaik_employee_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "team_members_kerjabaik_employee_id_key" ON "team_members"("kerjabaik_employee_id");
