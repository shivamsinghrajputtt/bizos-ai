"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  compact?: boolean;
  disabled?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function Select({
  value,
  onChange,
  options,
  label,
  compact = false,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  function updateMenuPosition() {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const estimatedMenuHeight = Math.min(6 * 44 + 8, 280);
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < Math.min(estimatedMenuHeight, 220) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(280, openAbove ? spaceAbove - gap : spaceBelow - gap),
    );

    setMenuPosition({
      top: openAbove ? Math.max(viewportPadding, rect.top - maxHeight - gap) : rect.bottom + gap,
      left: Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding),
      ),
      width: rect.width,
      maxHeight,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleViewportChange = () => updateMenuPosition();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((current) => Math.min(current + 1, options.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((current) => Math.max(current - 1, 0));
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = options[highlighted];
        if (option) {
          onChange(option.value);
          setOpen(false);
        }
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, options, highlighted, onChange]);

  useEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    setHighlighted(index >= 0 ? index : 0);
  }, [value, options]);

  if (!selected) return null;

  return (
    <div ref={rootRef} className="relative">
      {label && <span className="mb-2 block text-xs text-white/45">{label}</span>}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            updateMenuPosition();
            setOpen(true);
            setHighlighted(
              Math.max(0, options.findIndex((option) => option.value === value)),
            );
          }
        }}
        className={
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b0f15] text-left text-white/85 transition hover:border-cyan-400/40 hover:bg-[#0e131b] focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50 " +
          (compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm")
        }
      >
        <span className="truncate">{selected.label}</span>
        <span
          aria-hidden="true"
          className={
            "shrink-0 text-white/45 transition-transform " +
            (open ? "rotate-180" : "")
          }
        >
          ⌄
        </span>
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={label || "Select an option"}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            className="z-[100] overflow-y-auto rounded-xl border border-white/15 bg-[#0b0f15] p-1.5 shadow-2xl shadow-black/70 ring-1 ring-cyan-400/10"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={
                  "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition " +
                  (value === option.value
                    ? "bg-cyan-400/15 text-cyan-300"
                    : highlighted === index
                      ? "bg-white/[.08] text-white"
                      : "text-white/75 hover:bg-white/[.07] hover:text-white")
                }
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <span aria-hidden="true" className="text-cyan-300">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
