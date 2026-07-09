"use client";

import { memo, useCallback, useRef, useState } from "react";
import { AlertCircleIcon, CheckIcon, ChevronDownIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import {
  useScrollLock,
  useToolCallElapsed,
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartStatus,
} from "@assistant-ui/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ANIMATION_DURATION = 200;

function ToolFallbackRoot({ className, open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen = false, children, ...props }: React.ComponentProps<typeof Collapsible> & { open?: boolean; onOpenChange?: (open: boolean) => void; defaultOpen?: boolean }) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const handleOpenChange = useCallback((open: boolean) => {
    lockScroll();
    if (!isControlled) setUncontrolledOpen(open);
    controlledOnOpenChange?.(open);
  }, [lockScroll, isControlled, controlledOnOpenChange]);

  return (
    <Collapsible ref={collapsibleRef} open={isOpen} onOpenChange={handleOpenChange}
      className={cn("aui-tool-fallback-root group/tool-fallback-root w-full", className)}
      style={{ "--animation-duration": `${ANIMATION_DURATION}ms` } as React.CSSProperties}
      {...props}
    >
      {children}
    </Collapsible>
  );
}

const statusIconMap: Record<string, React.ElementType> = {
  running: LoaderIcon,
  complete: CheckIcon,
  incomplete: XCircleIcon,
  "requires-action": AlertCircleIcon,
};

function ToolFallbackDuration({ className, ...props }: React.ComponentProps<"span">) {
  const elapsedMs = useToolCallElapsed();
  if (elapsedMs === undefined) return null;
  const formatDuration = (ms: number) => {
    if (ms < 1000) return "<1s";
    const s = ms / 1000;
    if (s < 10) return `${(Math.floor(s * 10) / 10).toFixed(1)}s`;
    if (s < 60) return `${Math.floor(s)}s`;
    return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  };
  return <span className={cn("text-muted-foreground text-xs tabular-nums", className)} {...props}>{formatDuration(elapsedMs)}</span>;
}

function ToolFallbackTrigger({ toolName, status, className, ...props }: React.ComponentProps<typeof CollapsibleTrigger> & { toolName: string; status?: ToolCallMessagePartStatus }) {
  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled = status?.type === "incomplete" && status.reason === "cancelled";
  const Icon = statusIconMap[statusType] ?? CheckIcon;
  const label = isCancelled ? "Cancelled tool" : "Used tool";
  return (
    <CollapsibleTrigger
      className={cn("aui-tool-fallback-trigger group/trigger text-muted-foreground hover:text-foreground flex w-fit origin-left items-center gap-2 py-1.5 text-sm transition-[color,scale] active:scale-[0.98]", className)}
      {...props}
    >
      <Icon className={cn("size-4 shrink-0", isRunning && "animate-spin [animation-duration:0.6s]")} />
      <span className={cn("relative inline-block text-start leading-none", isCancelled && "line-through")}>
        <span>{label}: <b>{toolName}</b></span>
        {isRunning && <span aria-hidden className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none">{label}: <b>{toolName}</b></span>}
      </span>
      <ToolFallbackDuration />
      <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none", "group-data-[state=closed]/trigger:-rotate-90 group-data-[state=open]/trigger:rotate-0")} />
    </CollapsibleTrigger>
  );
}

function ToolFallbackContent({ className, children, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn(
        "aui-tool-fallback-content relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
        "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration) data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-2 ps-6 pt-1 pb-2">{children}</div>
    </CollapsibleContent>
  );
}

const ToolFallbackImpl: ToolCallMessagePartComponent = ({ toolName, argsText, result, status, addResult, resume }) => {
  const isCancelled = status?.type === "incomplete" && status.reason === "cancelled";
  const isRequiresAction = status?.type === "requires-action";
  const [open, setOpen] = useState(isRequiresAction);

  return (
    <ToolFallbackRoot open={open} onOpenChange={setOpen}>
      <ToolFallbackTrigger toolName={toolName} status={status} />
      <ToolFallbackContent>
        {status?.type === "incomplete" && status.error && (
          <p className="text-muted-foreground text-xs">{typeof status.error === "string" ? status.error : JSON.stringify(status.error)}</p>
        )}
        {argsText && (
          <pre className={cn("bg-muted/50 text-foreground/90 rounded-md p-2.5 text-xs whitespace-pre-wrap", isCancelled && "opacity-60")}>{argsText}</pre>
        )}
        {isRequiresAction && (
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={() => addResult?.("Approved by user")}>Allow</Button>
            <Button size="sm" variant="outline" onClick={() => addResult?.("User denied tool execution")}>Deny</Button>
          </div>
        )}
        {result !== undefined && !isCancelled && (
          <div>
            <p className="text-muted-foreground text-xs font-medium">Result:</p>
            <pre className="bg-muted/50 text-foreground/90 mt-1 rounded-md p-2.5 text-xs whitespace-pre-wrap">
              {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

const ToolFallback = memo(ToolFallbackImpl) as unknown as ToolCallMessagePartComponent;
ToolFallback.displayName = "ToolFallback";

export { ToolFallback, ToolFallbackRoot, ToolFallbackTrigger, ToolFallbackContent };
