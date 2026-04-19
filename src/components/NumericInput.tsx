"use client";

import { useRef, useLayoutEffect } from "react";

function formatThousands(val: string): string {
  if (!val || val === "-") return val;
  const n = parseInt(val);
  if (isNaN(n)) return val;
  return new Intl.NumberFormat("es-CL").format(n);
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
};

export default function NumericInput({ value, onChange, disabled, autoFocus, style, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const cursorPos = el.selectionStart ?? el.value.length;

    // Raw cursor = position in string excluding dot separators
    const rawCursor = el.value.slice(0, cursorPos).replace(/\./g, "").length;
    pendingCursorRef.current = rawCursor;

    // Keep only digits and a leading minus
    const stripped = el.value.replace(/\./g, "");
    const cleaned = stripped.startsWith("-")
      ? "-" + stripped.slice(1).replace(/[^0-9]/g, "")
      : stripped.replace(/[^0-9]/g, "");

    onChange(cleaned);
  }

  useLayoutEffect(() => {
    if (pendingCursorRef.current === null || !inputRef.current) return;
    if (document.activeElement !== inputRef.current) {
      pendingCursorRef.current = null;
      return;
    }

    const formatted = formatThousands(value);
    const targetRaw = pendingCursorRef.current;

    // Map raw cursor position back to formatted position (skipping dots)
    let rawCount = 0;
    let newCursorPos = formatted.length;
    for (let i = 0; i <= formatted.length; i++) {
      if (rawCount === targetRaw) { newCursorPos = i; break; }
      if (i < formatted.length && formatted[i] !== ".") rawCount++;
    }

    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
    pendingCursorRef.current = null;
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={formatThousands(value)}
      onChange={handleChange}
      disabled={disabled}
      autoFocus={autoFocus}
      style={style}
      placeholder={placeholder}
    />
  );
}
