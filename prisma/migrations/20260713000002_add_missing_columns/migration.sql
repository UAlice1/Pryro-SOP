-- Migration: add missing columns to sops and workflow_steps
-- These columns exist in the Prisma schema but were missing from the DB

-- Add industry and complianceFramework to sops
ALTER TABLE "sops" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "sops" ADD COLUMN IF NOT EXISTS "complianceFramework" TEXT;

-- Add phase, action, dependsOn to workflow_steps
ALTER TABLE "workflow_steps" ADD COLUMN IF NOT EXISTS "phase" TEXT;
ALTER TABLE "workflow_steps" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "workflow_steps" ADD COLUMN IF NOT EXISTS "dependsOn" INTEGER[] NOT NULL DEFAULT '{}';

-- Add task, assignedRole, priority, isCompleted to checklist_items
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "task" TEXT;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "assignedRole" TEXT;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Add roleName, coreDutySummary to responsibilities
ALTER TABLE "responsibilities" ADD COLUMN IF NOT EXISTS "roleName" TEXT;
ALTER TABLE "responsibilities" ADD COLUMN IF NOT EXISTS "coreDutySummary" TEXT;
