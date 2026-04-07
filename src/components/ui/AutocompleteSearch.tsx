"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface AutocompleteSearchProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<Option[]>;
  onSelect: (option: Option) => void;
  className?: string;
  debounceMs?: number;
}

export function AutocompleteSearch({
  placeholder = "Buscar...",
  onSearch,
  onSelect,
  className = "",
  debounceMs = 300,
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const results = await onSearch(query);
          setOptions(results);
          setIsOpen(true);
        } catch (error) {
          console.error("Error searching:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setOptions([]);
        setIsOpen(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, onSearch, debounceMs]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (options.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl overflow-auto border border-slate-100 ring-1 ring-black ring-opacity-5">
          <ul className="py-1">
            {options.map((option) => (
              <li
                key={option.id}
                className="cursor-pointer select-none relative py-3 pl-4 pr-9 hover:bg-indigo-50 transition-colors"
                onClick={() => {
                  setQuery(option.label);
                  setIsOpen(false);
                  onSelect(option);
                }}
              >
                <div className="flex flex-col">
                  <span className="block truncate font-medium text-slate-800">
                    {option.label}
                  </span>
                  {option.sublabel && (
                    <span className="block truncate text-sm text-slate-500 mt-0.5">
                      {option.sublabel}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isOpen && !isLoading && query.length >= 2 && options.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-xl rounded-xl border border-slate-100 py-4 px-4 text-center text-sm text-slate-500">
          No se encontraron resultados para "{query}"
        </div>
      )}
    </div>
  );
}
