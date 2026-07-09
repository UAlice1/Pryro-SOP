"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic } from "lucide-react";
import { AudioUploader } from "@/components/audio-uploader";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

/**
 * A floating mic button rendered inside the Thread's composer area.
 * When clicked it expands an AudioUploader panel above the input.
 * Drop this into the thread.tsx ComposerAction section.
 */
export function AudioComposerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="audio-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden mb-2"
          >
            <AudioUploader onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <TooltipIconButton
        tooltip="Voice / Audio input"
        side="top"
        type="button"
        variant="ghost"
        size="icon"
        className={`size-7 rounded-full transition-colors ${open ? "bg-red-100 text-red-500 dark:bg-red-900/30" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle audio input"
      >
        <Mic className="size-4" />
      </TooltipIconButton>
    </>
  );
}
