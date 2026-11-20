"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check, Sparkles, X } from "lucide-react";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function LocationCombobox({
  value,
  onChange,
  suggestions,
  placeholder = "Select or type a campus location",
  required = false,
  disabled = false,
  className = "",
}: LocationComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or tap
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Filter suggestions based on what user has typed
  const query = value.trim().toLowerCase();
  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(query)
  );

  const isExactSuggestion = suggestions.some(
    (s) => s.toLowerCase() === query
  );

  const isCustomEntry = query.length > 0 && !isExactSuggestion;

  const handleSelect = (selectedLocation: string) => {
    onChange(selectedLocation);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    inputRef.current?.focus();
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Combobox Input with Icons */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 flex items-center text-violet-400">
          <MapPin className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="w-full rounded-xl border border-zinc-800 bg-[#0e0a1e] pl-10 pr-16 py-2.5 text-xs text-white placeholder-zinc-500 transition focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition hover:bg-zinc-800/40"
              aria-label="Clear location"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition hover:bg-zinc-800/40"
            aria-label="Toggle location suggestions"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-violet-400" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-2xl border border-violet-500/30 bg-[#17122b] p-1.5 shadow-2xl shadow-purple-950/90 backdrop-blur-md">
          {/* Custom location indicator pill when user typed something novel */}
          {isCustomEntry && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
              className="flex items-center justify-between rounded-xl border border-violet-500/40 bg-violet-950/40 px-3 py-2 text-xs text-violet-200 cursor-pointer mb-1 transition hover:bg-violet-900/50"
            >
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="truncate">
                  Use custom location: <strong className="text-white">"{value}"</strong>
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-900/60 px-1.5 py-0.5 rounded border border-violet-700/50 shrink-0">
                Custom
              </span>
            </div>
          )}

          {/* Predefined Suggestions Header */}
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>{query ? "Matching Locations" : "Campus Suggestions"}</span>
            <span className="text-zinc-600 lowercase font-normal">or type anything</span>
          </div>

          {/* Filtered suggestions list */}
          {filteredSuggestions.length > 0 ? (
            <div className="space-y-0.5">
              {filteredSuggestions.map((loc) => {
                const isSelected = value.trim().toLowerCase() === loc.toLowerCase();
                return (
                  <button
                    key={loc}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(loc);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-violet-600/30 text-violet-200 border border-violet-500/30 font-medium"
                        : "text-zinc-300 hover:bg-violet-950/60 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{loc}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            !isCustomEntry && (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">
                No matching campus presets. Your typed entry will be saved as a custom location.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
