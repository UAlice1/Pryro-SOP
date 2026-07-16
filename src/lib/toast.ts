/**
 * Centralized toast notifications using sonner.
 * All app notifications should go through these helpers.
 */
import { toast } from "sonner";

type ToastAction = {
  label: string;
  onClick: () => void;
};

// ── Success ──────────────────────────────────────────────────────────────────

export function toastSuccess(message: string, description?: string, action?: ToastAction) {
  toast.success(message, { description, action });
}

// ── Error ────────────────────────────────────────────────────────────────────

export function toastError(message: string, description?: string) {
  toast.error(message, { description });
}

// ── Info ─────────────────────────────────────────────────────────────────────

export function toastInfo(message: string, description?: string, action?: ToastAction) {
  toast.info(message, { description, action });
}

// ── Warning ──────────────────────────────────────────────────────────────────

export function toastWarning(message: string, description?: string) {
  toast.warning(message, { description });
}

// ── SOP-specific helpers ─────────────────────────────────────────────────────

export const SopToast = {
  created: (title: string) =>
    toast.success("SOP created", {
      description: `"${title}" has been created as a draft.`,
    }),

  saved: (title: string) =>
    toast.success("Changes saved", {
      description: `"${title}" has been updated.`,
    }),

  deleted: (title: string) =>
    toast.success("SOP deleted", {
      description: `"${title}" has been permanently removed.`,
    }),

  duplicated: (title: string) =>
    toast.success("SOP duplicated", {
      description: `A copy of "${title}" has been created.`,
    }),

  archived: (title: string) =>
    toast.success("SOP archived", {
      description: `"${title}" has been archived.`,
    }),

  restored: (title: string) =>
    toast.success("SOP restored", {
      description: `"${title}" has been moved back to drafts.`,
    }),

  submitted: (title: string) =>
    toast.success("Submitted for review", {
      description: `"${title}" is now awaiting approval.`,
    }),

  approved: (title: string) =>
    toast.success("SOP approved", {
      description: `"${title}" has been approved.`,
    }),

  published: (title: string) =>
    toast.success("SOP published", {
      description: `"${title}" is now live and accessible to your team.`,
    }),

  exported: (format: string) =>
    toast.success(`Exported as ${format.toUpperCase()}`, {
      description: "Your file has been downloaded successfully.",
    }),

  aiGenerated: (title: string) =>
    toast.success("SOP generated", {
      description: `"${title}" has been created with all workflow steps and checklist.`,
    }),

  draftSaved: (title: string) =>
    toast.success("Draft saved", {
      description: `"${title}" has been saved as a draft.`,
    }),

  invited: (email: string) =>
    toast.success("Invitation sent", {
      description: `An invitation has been sent to ${email}.`,
    }),

  acknowledged: (title: string) =>
    toast.success("SOP acknowledged", {
      description: `You have acknowledged "${title}".`,
    }),

  commentPosted: () =>
    toast.success("Comment posted", {
      description: "Your comment has been added.",
    }),

  versionSaved: (version: number) =>
    toast.success(`Version ${version} saved`, {
      description: "A snapshot of the current SOP has been saved.",
    }),

  error: (action: string, reason?: string) =>
    toast.error(`${action} failed`, {
      description: reason ?? "Something went wrong. Please try again.",
    }),
};

// ── Auth helpers ─────────────────────────────────────────────────────────────

export const AuthToast = {
  welcome: (name: string) =>
    toast.success(`Welcome, ${name}`, {
      description: "You are now signed in to Pryro SOP.",
    }),

  signedOut: () =>
    toast.info("Signed out", {
      description: "You have been signed out successfully.",
    }),

  profileUpdated: () =>
    toast.success("Profile updated", {
      description: "Your profile changes have been saved.",
    }),
};

// ── Settings helpers ─────────────────────────────────────────────────────────

export const SettingsToast = {
  aiSaved: (provider: string, model: string) =>
    toast.success("AI settings saved", {
      description: `Now using ${provider} / ${model}.`,
    }),

  aiError: (reason?: string) =>
    toast.error("Failed to save AI settings", {
      description: reason ?? "Please check your API key and try again.",
    }),
};
