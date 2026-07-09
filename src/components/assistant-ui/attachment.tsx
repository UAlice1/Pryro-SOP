"use client";

import { type PropsWithChildren, useEffect, useState, type FC } from "react";
import { XIcon, PlusIcon, FileText, Loader2Icon, AlertCircleIcon } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogTitle, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!file) { setSrc(undefined); return; }
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => { URL.revokeObjectURL(objectUrl); };
  }, [file]);
  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]?.image;
      if (!src) return {};
      return { src };
    }),
  );
  return useFileSrc(file) ?? src;
};

const AttachmentPreview: FC<{ src: string }> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt="Attachment preview"
      className={cn("block h-auto max-h-[80vh] w-auto max-w-full object-contain", isLoaded ? "" : "invisible")}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();
  if (!src) return <>{children}</>;
  return (
    <Dialog>
      <DialogTrigger className="hover:bg-accent/50 cursor-pointer transition-colors" asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="p-2 sm:max-w-3xl">
        <DialogTitle className="sr-only">Image Attachment Preview</DialogTitle>
        <div className="bg-background relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const src = useAttachmentSrc();
  return (
    <Avatar className="h-full w-full rounded-none">
      <AvatarImage src={src} alt="Attachment preview" className="object-cover" />
      <AvatarFallback>
        <FileText className="text-muted-foreground size-8" />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";
  const isImage = useAuiState((s) => s.attachment.type === "image");
  const typeLabel = useAuiState((s) => {
    const type = s.attachment.type;
    switch (type) {
      case "image": return "Image";
      case "document": return "Document";
      case "file": return "File";
      default: return type;
    }
  });
  const uploadState = useAuiState((s) =>
    s.attachment.status.type === "running" ? "uploading"
      : s.attachment.status.type === "incomplete" && s.attachment.status.reason === "error" ? "error"
      : undefined,
  );
  const isUploading = uploadState === "uploading";
  const isError = uploadState === "error";

  return (
    <Tooltip>
      <AttachmentPrimitive.Root className={cn("relative", isImage && !isComposer && "only:*:first:size-24")}>
        <AttachmentPreviewDialog>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "bg-muted relative size-14 cursor-pointer overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border transition-opacity hover:opacity-75",
                isError && "border-destructive",
              )}
              role="button"
              tabIndex={0}
              aria-label={`${typeLabel} attachment${isError ? ", upload failed" : isUploading ? ", uploading" : ""}`}
            >
              <AttachmentThumb />
              {isUploading && (
                <div aria-hidden className="bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
                  <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
                </div>
              )}
              {isError && (
                <div aria-hidden className="bg-destructive/10 absolute inset-0 flex items-center justify-center">
                  <AlertCircleIcon className="text-destructive size-5" />
                </div>
              )}
            </div>
          </TooltipTrigger>
        </AttachmentPreviewDialog>
        {isComposer && (
          <AttachmentPrimitive.Remove asChild>
            <TooltipIconButton
              tooltip="Remove file"
              className="absolute end-1.5 top-1.5 size-3.5 rounded-full bg-white opacity-100 shadow-sm hover:bg-white!"
              side="top"
            >
              <XIcon className="size-3" />
            </TooltipIconButton>
          </AttachmentPrimitive.Remove>
        )}
      </AttachmentPrimitive.Root>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

export const UserMessageAttachments: FC = () => (
  <div className="col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
    <MessagePrimitive.Attachments>{() => <AttachmentUI />}</MessagePrimitive.Attachments>
  </div>
);

export const ComposerAttachments: FC = () => (
  <div className="flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden">
    <ComposerPrimitive.Attachments>{() => <AttachmentUI />}</ComposerPrimitive.Attachments>
  </div>
);

export const ComposerAddAttachment: FC = () => (
  <ComposerPrimitive.AddAttachment asChild>
    <TooltipIconButton
      tooltip="Add Attachment"
      side="bottom"
      variant="ghost"
      size="icon"
      className="hover:bg-muted-foreground/15 size-7 rounded-full p-1"
      aria-label="Add Attachment"
    >
      <PlusIcon className="size-4.5 stroke-[1.5px]" />
    </TooltipIconButton>
  </ComposerPrimitive.AddAttachment>
);
