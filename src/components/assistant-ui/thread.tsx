"use client";

import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/follow-up-suggestions";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartComponent,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
  Sparkles,
  FileText,
} from "lucide-react";
import { AudioComposerButton } from "@/components/assistant-ui/audio-composer-button";
import Link from "next/link";
import {
  createContext,
  useContext,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";

/* ─── Context & types ────────────────────────────────────────────────────── */

export type ThreadGroupPart = MessagePrimitive.GroupedParts.GroupPart;

export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  ToolFallback?: ToolCallMessagePartComponent | undefined;
  ToolGroup?: ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>> | undefined;
  ReasoningGroup?: ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>> | undefined;
};

export type ThreadProps = { components?: ThreadComponents | undefined };

const EMPTY_COMPONENTS: ThreadComponents = {};
const ThreadComponentsContext = createContext<ThreadComponents>(EMPTY_COMPONENTS);

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 && (!s.thread.isLoading || s.threads.isLoading);

/* ─── Root ───────────────────────────────────────────────────────────────── */

export const Thread: FC<ThreadProps> = ({ components = EMPTY_COMPONENTS }) => {
  const isEmpty = useAuiState(isNewChatView);
  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadRoot isEmpty={isEmpty} />
    </ThreadComponentsContext.Provider>
  );
};

const ThreadRoot: FC<{ isEmpty: boolean }> = ({ isEmpty }) => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext);
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--composer-bg" as string]: "var(--color-muted)",
        ["--composer-radius" as string]: "1.625rem",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {/* Inner column — centered, max-width capped */}
        <div
          className={cn(
            "mx-auto flex w-full flex-1 flex-col px-4 pt-8",
            "max-w-[var(--thread-max-width)]",
            isEmpty && "justify-center",
          )}
        >
          {/* Empty-state welcome screen */}
          <AuiIf condition={isNewChatView}>
            <Welcome />
          </AuiIf>

          {/* Message stream */}
          <div className="mb-8 flex flex-col gap-y-8 empty:hidden">
            <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          </div>

          {/* Sticky floating composer footer */}
          <ThreadPrimitive.ViewportFooter
            className={cn(
              "aui-thread-viewport-footer flex flex-col gap-3 overflow-visible pb-5 md:pb-6",
              !isEmpty && "sticky bottom-0 mt-auto",
            )}
          >
            <ThreadScrollToBottom />
            <ThreadFollowupSuggestions />
            <Composer />
            <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>
            {/* Disclaimer */}
            <p className="text-center text-[11px] text-muted-foreground/50 pb-1 hidden md:block">
              AI can make mistakes. Verify important information.
            </p>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

/* ─── Message router ─────────────────────────────────────────────────────── */

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessageComponent />;
};

/* ─── Scroll to bottom ───────────────────────────────────────────────────── */

const ThreadScrollToBottom: FC = () => (
  <ThreadPrimitive.ScrollToBottom asChild>
    <TooltipIconButton
      tooltip="Scroll to bottom"
      variant="outline"
      className="absolute -top-12 z-10 self-center rounded-full p-3 disabled:invisible shadow-md border-border/60 bg-background hover:bg-muted"
    >
      <ArrowDownIcon className="size-4" />
    </TooltipIconButton>
  </ThreadPrimitive.ScrollToBottom>
);

/* ─── Welcome / empty state ──────────────────────────────────────────────── */

const WelcomeActionCard: FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt?: string;
  href?: string;
}> = ({ icon, title, description, prompt, href }) => {
  const handleClick = () => {
    if (prompt) {
      const input = document.querySelector<HTMLTextAreaElement>(
        "[aria-label='Message input']",
      );
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        nativeInputValueSetter?.call(input, prompt);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        input.setSelectionRange(prompt.length, prompt.length);
      }
    }
  };

  const inner = (
    <div className="group flex flex-col gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted/60 hover:border-border/80 transition-all cursor-pointer text-left w-full h-full">
      <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{inner}</Link>;
  }
  return <button onClick={handleClick} className="block w-full h-full text-left">{inner}</button>;
};

const ThreadWelcome: FC = () => (
  <div className="aui-thread-welcome-root mb-8 flex flex-col items-center px-2 text-center">
    {/* Wordmark */}
    <h1 className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both text-[1.75rem] font-semibold tracking-tight text-foreground duration-200 mb-1">
      How can I help you today?
    </h1>
    <p className="text-muted-foreground text-sm mb-8 max-w-sm">
      Describe a process and I&apos;ll generate a complete SOP — or create one manually.
    </p>

    {/* 2×2 action cards */}
    <div className="grid grid-cols-2 gap-3 w-full max-w-lg text-left">
      <WelcomeActionCard
        icon={<Sparkles className="w-5 h-5" />}
        title="Generate with AI"
        description="Describe your process in plain English and AI builds the full SOP instantly."
        prompt="I want to create an SOP for "
      />
      <WelcomeActionCard
        icon={<FileText className="w-5 h-5" />}
        title="Create Manually"
        description="Start with a blank template and write your SOP step by step."
        href="/sops/new"
      />
      <WelcomeActionCard
        icon={<span className="text-lg">📋</span>}
        title="Draft an Employee Policy"
        description="Generate an employee-facing policy document from a quick description."
        prompt="Draft an employee policy for "
      />
      <WelcomeActionCard
        icon={<span className="text-lg">✅</span>}
        title="Check Compliance Status"
        description="Review which SOPs need acknowledgement or are overdue for review."
        prompt="Show me the compliance status for "
      />
    </div>
  </div>
);

/* ─── Thread suggestions ─────────────────────────────────────────────────── */

const ThreadSuggestions: FC = () => (
  <div className="flex w-full flex-wrap items-center justify-center gap-2 px-2">
    <ThreadPrimitive.Suggestions>
      {() => (
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-200">
          <SuggestionPrimitive.Trigger send asChild>
            <Button
              variant="ghost"
              className="text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
            >
              <SuggestionPrimitive.Title />
              <SuggestionPrimitive.Description className="empty:hidden" />
            </Button>
          </SuggestionPrimitive.Trigger>
        </div>
      )}
    </ThreadPrimitive.Suggestions>
  </div>
);

/* ─── Floating composer capsule ──────────────────────────────────────────── */

const Composer: FC = () => (
  <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
    <ComposerPrimitive.AttachmentDropzone asChild>
      {/*
        Floating capsule: rounded pill, semi-transparent backdrop,
        subtle border, no hard footer bar.
      */}
      <div
        className={cn(
          "flex w-full flex-col gap-2 rounded-[var(--composer-radius)] p-[var(--composer-padding)]",
          /* Light: #f4f4f4 solid fill. Dark: #2f2f2f solid fill. No colorful glow. */
          "bg-[#f4f4f4] dark:bg-[#2f2f2f]",
          "border border-[#e3e3e3] dark:border-[#3c3c3c]",
          "shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]",
          "dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.4)]",
          "transition-[border-color] duration-150",
          /* Focus: slightly darker border, still no color */
          "focus-within:border-[#c8c8c8] dark:focus-within:border-[#555555]",
          "data-[dragging=true]:border-dashed data-[dragging=true]:border-[#888888]",
        )}
      >
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Message Pryro..."
          className="aui-composer-input caret-foreground placeholder:text-[#676767] dark:placeholder:text-[#b4b4b4] max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed outline-none text-foreground"
          rows={1}
          autoFocus
          enterKeyHint="send"
          aria-label="Message input"
        />
        <ComposerAction />
      </div>
    </ComposerPrimitive.AttachmentDropzone>
  </ComposerPrimitive.Root>
);

const ComposerAction: FC = () => (
  <div className="flex items-center justify-between px-0.5">
    {/* Left tools */}
    <div className="flex items-center gap-0.5">
      <ComposerAddAttachment />
      <AudioComposerButton />
    </div>

    {/* Right: dictation + send/stop */}
    <div className="flex items-center gap-1.5">
      <AuiIf condition={(s) => s.thread.capabilities.dictation && s.composer.dictation == null}>
        <ComposerPrimitive.Dictate asChild>
          <TooltipIconButton
            tooltip="Voice input"
            side="bottom"
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Start voice input"
          >
            <MicIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Dictate>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.capabilities.dictation && s.composer.dictation != null}>
        <ComposerPrimitive.StopDictation asChild>
          <TooltipIconButton
            tooltip="Stop dictation"
            side="bottom"
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive size-8 rounded-full"
            aria-label="Stop voice input"
          >
            <SquareIcon className="size-3.5 animate-pulse fill-current" />
          </TooltipIconButton>
        </ComposerPrimitive.StopDictation>
      </AuiIf>

      {/* Send — dark filled circle with up-arrow, ChatGPT style */}
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button
            type="button"
            aria-label="Send message"
            className="flex items-center justify-center size-8 rounded-full bg-foreground text-background hover:opacity-80 disabled:opacity-30 transition-opacity"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>

      {/* Stop generating */}
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            type="button"
            aria-label="Stop generating"
            className="flex items-center justify-center size-8 rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
          >
            <SquareIcon className="size-3.5 fill-current" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </div>
);

/* ─── Error block ────────────────────────────────────────────────────────── */

const MessageError: FC = () => (
  <MessagePrimitive.Error>
    <ErrorPrimitive.Root className="border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-lg border p-3 text-sm dark:text-red-300">
      <ErrorPrimitive.Message className="line-clamp-3" />
    </ErrorPrimitive.Root>
  </MessagePrimitive.Error>
);

/* ─── Assistant message — borderless prose ───────────────────────────────── */

const AssistantMessage: FC = () => {
  const {
    ToolFallback: ToolFallbackComponent = ToolFallback,
    ToolGroup,
    ReasoningGroup,
  } = useContext(ThreadComponentsContext);

  return (
    <MessagePrimitive.Root
      data-role="assistant"
      className="animate-in fade-in slide-in-from-bottom-1 relative duration-150 w-full"
    >
      {/* Prose + tool content */}
      <div className="w-full text-foreground leading-[1.75] wrap-break-word text-[15px]">
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            reasoning: ["group-chainOfThought", "group-reasoning"],
            "tool-call": ["group-chainOfThought", "group-tool"],
            "standalone-tool-call": [],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div>{children}</div>;
              case "group-tool":
                if (ToolGroup) return <ToolGroup group={part}>{children}</ToolGroup>;
                return (
                  // defaultOpen=true so SOP/tool panels are visible without clicking
                  <ToolGroupRoot variant="ghost" defaultOpen={true}>
                    <ToolGroupTrigger count={part.indices.length} active={part.status.type === "running"} />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "group-reasoning": {
                if (ReasoningGroup) return <ReasoningGroup group={part}>{children}</ReasoningGroup>;
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot streaming={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                // Wrap tool UI in a block container so it never collapses
                return (
                  <div className="my-2 w-full">
                    {part.toolUI ?? <ToolFallbackComponent {...part} />}
                  </div>
                );
              case "data":
                return part.dataRendererUI;
              case "indicator":
                return (
                  <span
                    className="inline-block w-2 h-4 rounded-sm bg-foreground/40 animate-pulse align-middle"
                    aria-label="Assistant is working"
                  />
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      {/* Action bar below message */}
      <div className="flex items-center mt-2 -mb-6 min-h-6">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

/* ─── Assistant action bar ───────────────────────────────────────────────── */

const AssistantActionBar: FC = () => (
  <ActionBarPrimitive.Root
    hideWhenRunning
    autohide="not-last"
    className="text-muted-foreground animate-in fade-in flex gap-0.5 duration-200"
  >
    <ActionBarPrimitive.Copy asChild>
      <TooltipIconButton tooltip="Copy" className="size-7 rounded-lg hover:bg-muted hover:text-foreground">
        <AuiIf condition={(s) => s.message.isCopied}>
          <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
        </AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}>
          <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
        </AuiIf>
      </TooltipIconButton>
    </ActionBarPrimitive.Copy>
    <ActionBarPrimitive.Reload asChild>
      <TooltipIconButton tooltip="Regenerate" className="size-7 rounded-lg hover:bg-muted hover:text-foreground">
        <RefreshCwIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Reload>
    <ActionBarMorePrimitive.Root>
      <ActionBarMorePrimitive.Trigger asChild>
        <TooltipIconButton tooltip="More" className="size-7 rounded-lg hover:bg-muted hover:text-foreground data-[state=open]:bg-muted">
          <MoreHorizontalIcon />
        </TooltipIconButton>
      </ActionBarMorePrimitive.Trigger>
      <ActionBarMorePrimitive.Content
        side="bottom"
        align="start"
        sideOffset={6}
        className="bg-popover/95 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-[9rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
      >
        <ActionBarPrimitive.ExportMarkdown asChild>
          <ActionBarMorePrimitive.Item className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
            <DownloadIcon className="size-4" />
            Export as Markdown
          </ActionBarMorePrimitive.Item>
        </ActionBarPrimitive.ExportMarkdown>
      </ActionBarMorePrimitive.Content>
    </ActionBarMorePrimitive.Root>
  </ActionBarPrimitive.Root>
);

/* ─── User message — text-only, right-aligned, no bubble ─────────────────── */

const UserMessage: FC = () => (
  <MessagePrimitive.Root
    data-role="user"
    className="animate-in fade-in slide-in-from-bottom-1 duration-150 flex flex-col items-end gap-1"
  >
    <UserMessageAttachments />

    {/* Text content — clean, no bubble box */}
    <div className="relative max-w-[80%] group">
      <div className="text-foreground text-[15px] leading-[1.75] wrap-break-word text-right">
        <MessagePrimitive.Parts />
      </div>
      {/* Edit button appears on hover */}
      <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <UserActionBar />
      </div>
    </div>

    <BranchPicker className="-me-1" />
  </MessagePrimitive.Root>
);

/* ─── User action bar ────────────────────────────────────────────────────── */

const UserActionBar: FC = () => (
  <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="flex flex-col items-end">
    <ActionBarPrimitive.Edit asChild>
      <TooltipIconButton tooltip="Edit" className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
        <PencilIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Edit>
  </ActionBarPrimitive.Root>
);

/* ─── Edit composer ──────────────────────────────────────────────────────── */

const EditComposer: FC = () => (
  <MessagePrimitive.Root className="flex flex-col items-end px-0">
    <ComposerPrimitive.Root
      className={cn(
        "flex w-full max-w-[85%] flex-col rounded-[var(--composer-radius)]",
        "bg-[#f4f4f4] dark:bg-[#2f2f2f]",
        "border border-[#e3e3e3] dark:border-[#3c3c3c]",
        "shadow-sm",
      )}
    >
      <ComposerPrimitive.Input
        className="text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] outline-none"
        autoFocus
      />
      <div className="mx-3 mb-3 flex items-center gap-1.5 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-full px-3.5 text-sm">
            Cancel
          </Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button size="sm" className="h-8 rounded-full px-3.5 text-sm bg-foreground text-background hover:opacity-80">
            Update
          </Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  </MessagePrimitive.Root>
);

/* ─── Branch picker ──────────────────────────────────────────────────────── */

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({ className, ...rest }) => (
  <BranchPickerPrimitive.Root
    hideWhenSingleBranch
    className={cn(
      "text-muted-foreground inline-flex items-center text-xs",
      className,
    )}
    {...rest}
  >
    <BranchPickerPrimitive.Previous asChild>
      <TooltipIconButton tooltip="Previous" className="size-6 rounded hover:bg-muted">
        <ChevronLeftIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Previous>
    <span className="font-medium px-0.5">
      <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
    </span>
    <BranchPickerPrimitive.Next asChild>
      <TooltipIconButton tooltip="Next" className="size-6 rounded hover:bg-muted">
        <ChevronRightIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Next>
  </BranchPickerPrimitive.Root>
);
