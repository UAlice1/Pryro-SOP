-- Migration: add APPROVER and EDITOR to UserRole enum
-- PostgreSQL requires adding enum values via ALTER TYPE

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'APPROVER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EDITOR';
