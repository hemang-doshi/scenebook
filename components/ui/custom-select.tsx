"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  align?: "left" | "right";
}

export function CustomSelect({
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-black/45 px-3 py-1.5 text-xs text-foreground font-mono transition-all duration-200 outline-none hover:border-accent/40 focus:border-accent focus:ring-1 focus:ring-accent/20 cursor-pointer select-none",
          triggerClassName
        )}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-1.5", isOpen && "transform rotate-180")} />
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface-contrast/95 backdrop-blur-md p-1 shadow-2xl animate-[ed-fadeIn_0.15s_ease-out] min-w-[150px] ed-scrollbar",
            align === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={cn(
                "flex w-full items-center rounded px-2.5 py-1.5 text-left text-xs font-mono transition-colors duration-150 cursor-pointer select-none",
                opt.value === value
                  ? "bg-accent/15 text-accent font-semibold"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
