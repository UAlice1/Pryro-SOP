"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { X, UserPlus, Loader2, Send, MailCheck, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Responsibility {
  id:       string;
  role:     string;
  roleName: string | null;
}

interface InviteResult {
  email:  string;
  status: "invited" | "already_invited" | "not_found";
}

interface InviteStaffDialogProps {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  sopId:          string;
  sopTitle?:      string;
  responsibilities?: Responsibility[];
}

/* ─── Email chip ─────────────────────────────────────────────────────────── */
function EmailChip({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
      "bg-[#ececec] text-[#0d0d0d] dark:bg-[#3c3c3c] dark:text-[#ffffff]",
    )}>
      {email}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
        aria-label={`Remove ${email}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/* ─── Result row ─────────────────────────────────────────────────────────── */
function ResultRow({ result }: { result: InviteResult }) {
  const icon =
    result.status === "invited"        ? <MailCheck   className="w-3.5 h-3.5 text-foreground shrink-0" /> :
    result.status === "already_invited"? <MailCheck   className="w-3.5 h-3.5 text-[#b4b4b4] shrink-0" /> :
                                         <AlertCircle className="w-3.5 h-3.5 text-[#b4b4b4] shrink-0" />;

  const label =
    result.status === "invited"         ? "Invited"     :
    result.status === "already_invited" ? "Re-notified" : "Not in org";

  return (
    <div className="flex items-center gap-2 py-1.5">
      {icon}
      <span className="flex-1 text-xs text-foreground truncate">{result.email}</span>
      <span className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
        result.status === "invited"
          ? "bg-[#ececec] text-[#0d0d0d] dark:bg-[#3c3c3c] dark:text-[#ffffff]"
          : "bg-[#f4f4f4] text-[#b4b4b4] dark:bg-[#2f2f2f] dark:text-[#b4b4b4]",
      )}>
        {label}
      </span>
    </div>
  );
}

/* ─── Main dialog ────────────────────────────────────────────────────────── */
export function InviteStaffDialog({
  open,
  onOpenChange,
  sopId,
  sopTitle,
  responsibilities: propResponsibilities,
}: InviteStaffDialogProps) {
  const [inputValue,       setInputValue]       = useState("");
  const [emails,           setEmails]           = useState<string[]>([]);
  const [assignedRoleId,   setAssignedRoleId]   = useState<string>("");
  const [sending,          setSending]          = useState(false);
  const [results,          setResults]          = useState<InviteResult[] | null>(null);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(propResponsibilities ?? []);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Fetch responsibilities if not passed as prop */
  useEffect(() => {
    if (!open) return;
    if (propResponsibilities && propResponsibilities.length > 0) {
      setResponsibilities(propResponsibilities);
      return;
    }
    fetch(`/api/sops/${sopId}`)
      .then((r) => r.json())
      .then((data) => {
        const roles: Responsibility[] = (data.responsibilities ?? []).map(
          (r: { id: string; role: string; roleName?: string | null }) => ({
            id:       r.id,
            role:     r.role,
            roleName: r.roleName ?? null,
          }),
        );
        setResponsibilities(roles);
      })
      .catch(() => {/* silent — role dropdown stays empty */});
  }, [open, sopId, propResponsibilities]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const addEmail = (raw: string) => {
    const trimmed = raw.trim().replace(/,+$/, "");
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { toast.error(`"${trimmed}" is not a valid email address`); return; }
    if (emails.includes(trimmed)) { toast.error("Already added"); setInputValue(""); return; }
    setEmails((prev) => [...prev, trimmed]);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const parts   = e.clipboardData.getData("text").split(/[\s,;]+/).filter(Boolean);
    const valid:   string[] = [];
    const invalid: string[] = [];
    for (const p of parts) {
      if (isValidEmail(p) && !emails.includes(p)) valid.push(p);
      else if (!isValidEmail(p)) invalid.push(p);
    }
    if (valid.length)   setEmails((prev) => [...prev, ...valid]);
    if (invalid.length) toast.error(`Skipped invalid: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`);
  };

  const handleSend = async () => {
    const finalEmails = [...emails];
    if (inputValue.trim() && isValidEmail(inputValue.trim())) {
      finalEmails.push(inputValue.trim());
      setEmails(finalEmails);
      setInputValue("");
    }
    if (finalEmails.length === 0) { toast.error("Add at least one email address"); return; }

    setSending(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/invite`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          emails:         finalEmails,
          assignedRoleId: assignedRoleId || undefined,
        }),
      });

      const data = await res.json() as {
        invited:  number;
        notFound: string[];
        results:  InviteResult[];
        error?:   string;
      };

      if (!res.ok) { toast.error(data.error ?? "Failed to send invitations"); return; }

      setResults(data.results);
      if (data.invited > 0)       toast.success(`${data.invited} staff member${data.invited > 1 ? "s" : ""} invited`);
      if (data.notFound.length > 0) toast.error(`${data.notFound.length} email${data.notFound.length > 1 ? "s" : ""} not found in your organisation`);
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setEmails([]);
      setInputValue("");
      setAssignedRoleId("");
      setResults(null);
    }, 200);
  };

  const selectedRole = responsibilities.find((r) => r.id === assignedRoleId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-md rounded-2xl",
        "bg-white dark:bg-[#2f2f2f]",
        "border border-[#e3e3e3] dark:border-[#3c3c3c]",
        "shadow-[0_8px_40px_-8px_rgba(0,0,0,0.18)]",
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <UserPlus className="w-4 h-4 shrink-0" />
            Invite Staff Members
          </DialogTitle>
          {sopTitle && (
            <DialogDescription className="text-xs text-[#676767] dark:text-[#b4b4b4] truncate">
              {sopTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#676767] dark:text-[#b4b4b4]">
              Enter email addresses and optionally assign an AI-generated role. Invited staff will receive a magic link to their execution workspace.
            </p>

            {/* Role selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assign AI-Generated Role</Label>
              <Select
                value={assignedRoleId}
                onValueChange={(v) => setAssignedRoleId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className={cn(
                  "h-9 text-xs w-full",
                  "bg-[#f4f4f4] dark:bg-[#212121]",
                  "border border-[#e3e3e3] dark:border-[#3c3c3c]",
                )}>
                  <SelectValue placeholder="Select a role (optional)">
                    {selectedRole ? (selectedRole.roleName ?? selectedRole.role) : "Select a role (optional)"}
                  </SelectValue>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">
                    No role assigned
                  </SelectItem>
                  {responsibilities.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.roleName ?? r.role}
                    </SelectItem>
                  ))}
                  {responsibilities.length === 0 && (
                    <div className="py-2 px-3 text-xs text-muted-foreground">
                      No AI-generated roles found for this SOP.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Email chips + input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email Addresses</Label>
              <div
                className={cn(
                  "min-h-[72px] w-full flex flex-wrap gap-1.5 p-2.5 rounded-xl cursor-text",
                  "bg-[#f4f4f4] dark:bg-[#212121]",
                  "border border-[#e3e3e3] dark:border-[#3c3c3c]",
                  "focus-within:border-[#c8c8c8] dark:focus-within:border-[#555555]",
                  "transition-colors",
                )}
                onClick={() => inputRef.current?.focus()}
              >
                {emails.map((email) => (
                  <EmailChip
                    key={email}
                    email={email}
                    onRemove={() => setEmails((prev) => prev.filter((e) => e !== email))}
                  />
                ))}
                <input
                  ref={inputRef}
                  type="email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onBlur={() => inputValue.trim() && addEmail(inputValue)}
                  placeholder={emails.length === 0 ? "name@company.com, another@company.com…" : "Add more…"}
                  className={cn(
                    "flex-1 min-w-[180px] bg-transparent text-sm outline-none",
                    "text-foreground placeholder:text-[#b4b4b4]",
                  )}
                  aria-label="Email address input"
                />
              </div>
              <p className="text-[10px] text-[#b4b4b4]">
                Press{" "}
                <kbd className="px-1 py-0.5 rounded bg-[#ececec] dark:bg-[#3c3c3c] font-mono text-[9px]">Enter</kbd>
                {" "}or{" "}
                <kbd className="px-1 py-0.5 rounded bg-[#ececec] dark:bg-[#3c3c3c] font-mono text-[9px]">,</kbd>
                {" "}to add. Paste a comma-separated list to bulk-add.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-[#b4b4b4]">
                {emails.length > 0 ? `${emails.length} recipient${emails.length > 1 ? "s" : ""}` : "No recipients yet"}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={sending || (emails.length === 0 && !inputValue.trim())}
                  onClick={handleSend}
                  className={cn(
                    "h-8 px-4 text-xs gap-1.5",
                    "bg-[#0d0d0d] text-white hover:bg-[#2f2f2f]",
                    "dark:bg-[#ffffff] dark:text-[#0d0d0d] dark:hover:bg-[#ececec]",
                    "border-0 shadow-none",
                  )}
                >
                  {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {sending ? "Sending…" : "Send Invitations"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Results stage */
          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#676767] dark:text-[#b4b4b4]">
              Invitation summary — staff members found in your organisation have been sent a magic link.
            </p>

            <div className={cn(
              "rounded-xl divide-y",
              "bg-[#f9f9f9] dark:bg-[#212121]",
              "border border-[#e3e3e3] dark:border-[#3c3c3c]",
              "divide-[#e3e3e3] dark:divide-[#3c3c3c]",
            )}>
              {results.map((r) => (
                <div key={r.email} className="px-3">
                  <ResultRow result={r} />
                </div>
              ))}
            </div>

            {results.some((r) => r.status === "not_found") && (
              <p className="text-[11px] text-[#b4b4b4] leading-relaxed">
                Addresses marked <strong className="text-foreground">&ldquo;Not in org&rdquo;</strong> are not registered
                in your workspace. Ask them to create an account first, then re-invite.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => { setResults(null); setEmails([]); setAssignedRoleId(""); }}
              >
                Invite More
              </Button>
              <Button
                size="sm"
                onClick={handleClose}
                className={cn(
                  "h-8 px-4 text-xs",
                  "bg-[#0d0d0d] text-white hover:bg-[#2f2f2f]",
                  "dark:bg-[#ffffff] dark:text-[#0d0d0d] dark:hover:bg-[#ececec]",
                  "border-0 shadow-none",
                )}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
