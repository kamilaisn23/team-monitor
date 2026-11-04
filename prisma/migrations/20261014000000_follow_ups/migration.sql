-- CreateTable
CREATE TABLE "follow_ups" (
    "issue_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unreviewed',
    "note" TEXT NOT NULL DEFAULT '',
    "owner_id" TEXT,
    "owner_name" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("issue_id")
);

-- CreateTable
CREATE TABLE "follow_up_history" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "owner_id" TEXT,
    "owner_name" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'edit',

    CONSTRAINT "follow_up_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_ups_status_issue_id_idx" ON "follow_ups"("status", "issue_id");

-- CreateIndex
CREATE INDEX "follow_ups_owner_id_idx" ON "follow_ups"("owner_id");

-- CreateIndex
CREATE INDEX "follow_up_history_issue_id_changed_at_idx" ON "follow_up_history"("issue_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_history_issue_id_revision_key" ON "follow_up_history"("issue_id", "revision");

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_history" ADD CONSTRAINT "follow_up_history_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "follow_ups"("issue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_history" ADD CONSTRAINT "follow_up_history_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_history" ADD CONSTRAINT "follow_up_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Import the last valid legacy version. Keep all raw Settings records for
-- rollback/audit; unavailable historical versions cannot be reconstructed.
DO $$
DECLARE
  entry RECORD;
  payload JSONB;
  issue_key TEXT;
  owner_key TEXT;
  owner_label TEXT;
  changed TIMESTAMP(3);
BEGIN
  FOR entry IN SELECT key, value FROM settings WHERE key LIKE 'attention:issue:%' LOOP
    BEGIN
      payload := entry.value::jsonb;
      changed := (payload->>'updatedAt')::timestamptz AT TIME ZONE 'UTC';
    EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN
      RAISE WARNING 'Legacy follow-up retained for manual review: %', entry.key;
      CONTINUE;
    END;
    issue_key := substring(entry.key FROM 17);
    IF NOT EXISTS (SELECT 1 FROM issues WHERE id = issue_key)
      OR jsonb_typeof(payload->'status') IS DISTINCT FROM 'string'
      OR payload->>'status' NOT IN ('unreviewed','following_up','reviewed')
      OR jsonb_typeof(payload->'note') IS DISTINCT FROM 'string'
      OR length(payload->>'note') > 2000
      OR jsonb_typeof(payload->'revision') IS DISTINCT FROM 'string'
      OR jsonb_typeof(payload->'updatedBy') IS DISTINCT FROM 'string'
      OR changed IS NULL
      OR (jsonb_typeof(payload->'ownerId') IS DISTINCT FROM 'string' AND jsonb_typeof(payload->'ownerId') IS DISTINCT FROM 'null')
    THEN
      RAISE WARNING 'Legacy follow-up retained for manual review: %', entry.key;
      CONTINUE;
    END IF;
    SELECT id, name INTO owner_key, owner_label FROM team_members WHERE id = payload->>'ownerId';
    IF owner_label IS NULL AND payload->>'ownerId' IS NOT NULL THEN
      owner_label := 'Anggota sebelumnya (ID ' || (payload->>'ownerId') || ')';
    END IF;
    INSERT INTO follow_ups (issue_id,status,note,owner_id,owner_name,actor_id,actor_name,revision,updated_at)
      VALUES (issue_key,payload->>'status',payload->>'note',owner_key,owner_label,NULL,payload->>'updatedBy',payload->>'revision',changed);
    INSERT INTO follow_up_history (id,issue_id,revision,status,note,owner_id,owner_name,actor_id,actor_name,changed_at,origin)
      VALUES ('legacy_' || md5(issue_key),issue_key,payload->>'revision',payload->>'status',payload->>'note',owner_key,owner_label,NULL,payload->>'updatedBy',changed,'legacy_import');
  END LOOP;
END $$;

ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_status_check CHECK (status IN ('unreviewed','following_up','reviewed'));
ALTER TABLE follow_up_history ADD CONSTRAINT follow_up_history_status_check CHECK (status IN ('unreviewed','following_up','reviewed'));
