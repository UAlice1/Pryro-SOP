-- Migration: soft_delete_normalized_tags_version_approval_link
-- 1. Add deletedAt to sops (soft delete)
-- 2. Replace flat sop_tags with a normalized tags + sop_tags join table
-- 3. Link sop_versions to approvals

-- ─── 1. Soft delete: add deletedAt to sops ──────────────────────────
ALTER TABLE "sops" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- ─── 2. Normalized Tag system ────────────────────────────────────────
-- Create org-scoped tags table
CREATE TABLE "tags" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- Unique tag name per org
CREATE UNIQUE INDEX "tags_organizationId_name_key" ON "tags"("organizationId", "name");

-- Foreign key: tags -> organizations
ALTER TABLE "tags" ADD CONSTRAINT "tags_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing sop_tags data into the normalized tables
-- For each distinct (organizationId, tag) pair, create a Tag row
INSERT INTO "tags" ("id", "name", "organizationId", "createdAt")
SELECT
    gen_random_uuid()::text,
    st.tag,
    s."organizationId",
    NOW()
FROM "sop_tags" st
JOIN "sops" s ON s.id = st."sopId"
WHERE s."organizationId" IS NOT NULL
ON CONFLICT ("organizationId", "name") DO NOTHING;

-- Rebuild sop_tags as a proper join table
-- First capture existing links
CREATE TEMP TABLE _sop_tags_backup AS
    SELECT st."sopId", st.tag, s."organizationId"
    FROM "sop_tags" st
    JOIN "sops" s ON s.id = st."sopId"
    WHERE s."organizationId" IS NOT NULL;

-- Drop the old sop_tags table
DROP TABLE "sop_tags";

-- Create new sop_tags join table
CREATE TABLE "sop_tags" (
    "sopId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "sop_tags_pkey" PRIMARY KEY ("sopId", "tagId")
);

-- Foreign key: sop_tags -> sops
ALTER TABLE "sop_tags" ADD CONSTRAINT "sop_tags_sopId_fkey"
    FOREIGN KEY ("sopId") REFERENCES "sops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key: sop_tags -> tags
ALTER TABLE "sop_tags" ADD CONSTRAINT "sop_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-insert migrated links
INSERT INTO "sop_tags" ("sopId", "tagId")
SELECT b."sopId", t."id"
FROM _sop_tags_backup b
JOIN "tags" t ON t."name" = b.tag AND t."organizationId" = b."organizationId"
ON CONFLICT DO NOTHING;

DROP TABLE _sop_tags_backup;

-- ─── 3. Link sop_versions to approvals ───────────────────────────────
ALTER TABLE "sop_versions" ADD COLUMN "approvalId" TEXT;

ALTER TABLE "sop_versions" ADD CONSTRAINT "sop_versions_approvalId_fkey"
    FOREIGN KEY ("approvalId") REFERENCES "approvals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
