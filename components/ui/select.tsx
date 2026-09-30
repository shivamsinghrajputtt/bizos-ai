"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
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
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKeyDown);
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
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlighted(Math.max(0, options.findIndex((option) => option.value === value)));
          }
        }}
        className={
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b0f15] text-left text-white/85 transition hover:border-cyan-400/40 hover:bg-[#0e131b] focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50 " +
          (compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm")
        }
      >
        <span className="truncate">{selected.label}</span>
        <span aria-hidden="true" className={"shrink-0 text-white/45 transition-transform " + (open ? "rotate-180" : "")}>⌄</span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label || "Select an option"}
          className="absolute left-0 top-full z-30 mt-2 max-h-64 w-full min-w-[180px] overflow-auto rounded-xl border border-white/15 bg-[#0b0f15] p-1 shadow-2xl shadow-black/60 ring-1 ring-black/40"
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
                  ? "bg-cyan-400/10 text-cyan-300"
                  : highlighted === index
                    ? "bg-white/[.07] text-white"
                    : "text-white/75 hover:bg-white/[.07] hover:text-white")
              }
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <span aria-hidden="true" className="text-cyan-300">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
