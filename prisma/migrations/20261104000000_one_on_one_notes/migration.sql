-- CreateEnum
CREATE TYPE "OneOnOneSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEEDS_SUPPORT');

-- CreateTable
CREATE TABLE "one_on_one_notes" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "focus_area" TEXT NOT NULL DEFAULT '',
    "action_items" TEXT NOT NULL DEFAULT '',
    "sentiment" "OneOnOneSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_on_one_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "one_on_one_notes_member_id_date_idx" ON "one_on_one_notes"("member_id", "date");

-- AddForeignKey
ALTER TABLE "one_on_one_notes" ADD CONSTRAINT "one_on_one_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_one_notes" ADD CONSTRAINT "one_on_one_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
