"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  className?: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  align?: "left" | "right";
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  className,
  triggerClassName,
  dropdownClassName,
  align = "left",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full", className)}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] px-4 py-2.5 text-sm text-[var(--ink)] transition-all duration-200 outline-none hover:border-[var(--ink)] focus:ring-2 focus:ring-[var(--ink)]/10 cursor-pointer select-none",
          triggerClassName
        )}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={cn("h-4 w-4 text-[var(--muted)] transition-transform duration-200 shrink-0 ml-2", isOpen && "transform rotate-180")} />
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-[ed-fadeIn_0.15s_ease-out] min-w-[150px] scrollbar-thin",
            align === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center rounded-sm px-3 py-2 text-left text-sm transition-colors duration-150 cursor-pointer select-none",
                  isSelected
                    ? "bg-[var(--surface-soft)] text-[var(--ink)] font-semibold"
                    : "text-[var(--ink)]/70 hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]",
                  opt.className
                )}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
