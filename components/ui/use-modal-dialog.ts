"use client";

import { useEffect, useRef } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useModalDialog({
  open,
  onClose,
  canClose = true,
}: {
  open: boolean;
  onClose: () => void;
  canClose?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const focusables = () => dialog
      ? [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.hidden)
      : [];
    const initialFocus = dialog?.querySelector<HTMLElement>("[data-dialog-initial-focus]") ?? focusables()[0] ?? dialog;
    window.requestAnimationFrame(() => initialFocus?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && canClose) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => (trigger ?? previouslyFocused)?.focus());
    };
  }, [canClose, open]);

  return { dialogRef, triggerRef };
}
