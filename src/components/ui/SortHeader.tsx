"use client";

import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

interface SortHeaderProps {
  label: string;
  sortKey: string;
  currentKey: string | null;
  direction: "asc" | "desc" | null;
  onToggle: (key: string) => void;
  align?: "left" | "right" | "center";
}

export function SortHeader({ label, sortKey, currentKey, direction, onToggle, align = "left" }: SortHeaderProps) {
  const active = currentKey === sortKey;
  const alignClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <th
      className={`px-6 py-4 cursor-pointer select-none group/th hover:text-gray-600 transition-colors text-${align}`}
      onClick={() => onToggle(sortKey)}
    >
      <span className={`inline-flex items-center gap-1.5 ${alignClass}`}>
        {label}
        <span className="inline-flex flex-col">
          {active && direction === "asc" && <ChevronUp size={14} className="text-red-600" />}
          {active && direction === "desc" && <ChevronDown size={14} className="text-red-600" />}
          {!active && <ArrowUpDown size={12} className="opacity-0 group-hover/th:opacity-50 transition-opacity" />}
        </span>
      </span>
    </th>
  );
}
