"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  useScrollLock,
  useAuiState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;
const ReasoningPreviewContext = createContext(false);

const reasoningVariants = cva("aui-reasoning-root mb-4 w-full", {
  variants: {
    variant: {
      outline: "rounded-lg border px-3 py-2",
      ghost: "",
      muted: "bg-muted/50 rounded-lg px-3 py-2",
    },
  },
  defaultVariants: { variant: "outline" },
});

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof reasoningVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    streaming?: boolean;
  };

function ReasoningRoot({
  className, variant, open: controlledOpen, onOpenChange: controlledOnOpenChange,
  defaultOpen = false, streaming, children, ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const initialOpenRef = useRef(defaultOpen);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : (userOpen ?? streaming ?? initialOpenRef.current);
  const isAutoMode = isControlled || userOpen === null;
  const isPreview = streaming === true && isOpen && isAutoMode;

  const prevStreamingRef = useRef(streaming);
  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return;
    prevStreamingRef.current = streaming;
    if (!isControlled && userOpen === null) lockScroll();
  }, [streaming, isControlled, userOpen, lockScroll]);

  const handleOpenChange = useCallback((open: boolean) => {
    lockScroll();
    if (!isControlled) setUserOpen(open);
    controlledOnOpenChange?.(open);
  }, [lockScroll, isControlled, controlledOnOpenChange]);

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("group/reasoning-root", reasoningVariants({ variant, className }))}
      style={{ "--animation-duration": `${ANIMATION_DURATION}ms` } as React.CSSProperties}
      {...props}
    >
      <ReasoningPreviewContext.Provider value={isPreview}>
        {children}
      </ReasoningPreviewContext.Provider>
    </Collapsible>
  );
}

function ReasoningTrigger({ active, duration, className, ...props }: React.ComponentProps<typeof CollapsibleTrigger> & { active?: boolean; duration?: number }) {
  const durationText = duration ? ` (${duration}s)` : "";
  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "aui-reasoning-trigger group/trigger text-muted-foreground hover:text-foreground flex max-w-[75%] origin-left items-center gap-2 py-1.5 text-sm transition-[color,scale] active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      <BrainIcon className="size-4 shrink-0" />
      <span className="relative inline-block leading-none tabular-nums">
        <span>Reasoning{durationText}</span>
        {active && (
          <span aria-hidden className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none">
            Reasoning{durationText}
          </span>
        )}
      </span>
      <ChevronDownIcon className={cn(
        "mt-0.5 size-4 shrink-0 transition-transform duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        "group-data-[state=closed]/trigger:-rotate-90 group-data-[state=open]/trigger:rotate-0",
      )} />
    </CollapsibleTrigger>
  );
}

function ReasoningContent({ className, children, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  const isPreview = useContext(ReasoningPreviewContext);
  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "aui-reasoning-content text-muted-foreground relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
        "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration) data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      {children}
      {isPreview && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-[linear-gradient(to_top,var(--color-background),transparent)]" />
      )}
    </CollapsibleContent>
  );
}

function ReasoningText({ className, children, ...props }: React.ComponentProps<"div">) {
  const isPreview = useContext(ReasoningPreviewContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPreview) return;
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;
    const pin = () => { scrollEl.scrollTop = scrollEl.scrollHeight; };
    pin();
    const observer = new ResizeObserver(pin);
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [isPreview]);

  return (
    <div
      ref={scrollRef}
      data-slot="reasoning-text"
      className={cn(
        "aui-reasoning-text relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed text-pretty",
        "group-data-[state=open]/collapsible-content:animate-in group-data-[state=open]/collapsible-content:fade-in-0 group-data-[state=open]/collapsible-content:slide-in-from-top-4",
        "group-data-[state=closed]/collapsible-content:animate-out group-data-[state=closed]/collapsible-content:fade-out-0 group-data-[state=closed]/collapsible-content:slide-out-to-top-4",
        className,
      )}
      {...props}
    >
      <div ref={contentRef} className="space-y-4">{children}</div>
    </div>
  );
}

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;
const ReasoningGroupImpl: ReasoningGroupComponent = ({ children, startIndex, endIndex }) => {
  const isReasoningStreaming = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;
    const lastIndex = s.message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = s.message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });
  return (
    <ReasoningRoot streaming={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

const Reasoning = memo(ReasoningImpl) as unknown as ReasoningMessagePartComponent & {
  Root: typeof ReasoningRoot;
  Trigger: typeof ReasoningTrigger;
  Content: typeof ReasoningContent;
  Text: typeof ReasoningText;
};
Reasoning.displayName = "Reasoning";
Reasoning.Root = ReasoningRoot;
Reasoning.Trigger = ReasoningTrigger;
Reasoning.Content = ReasoningContent;
Reasoning.Text = ReasoningText;

const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";

export { Reasoning, ReasoningGroup, ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText, reasoningVariants };
