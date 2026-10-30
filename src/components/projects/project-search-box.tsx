"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";

import { Input } from "@/components/ui/input";

type Suggestion = {
  term: string;
  source: string;
  href?: string;
};

export function ProjectSearchBox({
  defaultValue,
  ariaLabel = "Buscar projetos",
}: {
  defaultValue: string;
  ariaLabel?: string;
}) {
  const inputId = React.useId();
  const listboxId = React.useId();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const suggestionCacheRef = React.useRef(new Map<string, Suggestion[]>());
  const [value, setValue] = React.useState(defaultValue);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const dismissedRef = React.useRef(false);
  const expanded = isOpen && value.trim().length >= 2;

  React.useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      return;
    }

    const cached = suggestionCacheRef.current.get(query);
    if (cached) {
      setSuggestions(cached);
      setIsOpen(isFocused && !dismissedRef.current);
      setActiveIndex(-1);
      setStatus(cached.length ? `${cached.length} sugestões encontradas.` : "Nenhuma sugestão encontrada.");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/projects/search-suggestions?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`suggestions_${response.status}`);
        const payload = (await response.json()) as { suggestions?: Suggestion[] };
        const nextSuggestions = payload.suggestions ?? [];
        const cache = suggestionCacheRef.current;
        if (cache.size >= 20) cache.delete(cache.keys().next().value ?? "");
        cache.set(query, nextSuggestions);
        setSuggestions(nextSuggestions);
        setIsOpen(isFocused && !dismissedRef.current);
        setActiveIndex(-1);
        setStatus(
          nextSuggestions.length
            ? `${nextSuggestions.length} sugestões encontradas.`
            : "Nenhuma sugestão encontrada."
        );
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setStatus("Não foi possível carregar sugestões agora.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isFocused, value]);

  React.useEffect(() => {
    formRef.current = containerRef.current?.closest("form") ?? null;
  }, []);

  function submitSuggestion(suggestion: Suggestion) {
    dismissedRef.current = true;
    setActiveIndex(-1);
    setValue(suggestion.term);
    setIsOpen(false);
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  function updateSearchValue(nextValue: string) {
    dismissedRef.current = false;
    setActiveIndex(-1);
    setValue(nextValue);

    if (nextValue.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      setStatus("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input
        id={inputId}
        name="q"
        value={value}
        onChange={(event) => updateSearchValue(event.target.value)}
        onFocus={() => {
          dismissedRef.current = false;
          setIsFocused(true);
          setIsOpen(value.trim().length >= 2);
        }}
        onBlur={() => {
          setIsFocused(false);
          dismissedRef.current = true;
          setIsOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            if (expanded) event.preventDefault();
            dismissedRef.current = true;
            setIsOpen(false);
            setActiveIndex(-1);
          } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length && value.trim().length >= 2) {
            event.preventDefault();
            dismissedRef.current = false;
            setIsOpen(true);
            const next = event.key === "ArrowDown"
              ? (activeIndex + 1) % suggestions.length
              : (activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
            setActiveIndex(next);
            document.getElementById(`${listboxId}-${next}`)?.scrollIntoView({ block: "nearest" });
          } else if (event.key === "Enter" && expanded && activeIndex >= 0) {
            event.preventDefault();
            document.getElementById(`${listboxId}-${activeIndex}`)?.click();
          }
        }}
        placeholder="Busque por Gol AP, orbital, daily, Civic K20..."
        className="pl-11 pr-10"
        autoComplete="off"
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-activedescendant={expanded && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-controls={expanded ? listboxId : undefined}
        aria-describedby={`${inputId}-status`}
      />
      {isLoading ? (
        <Loader2
          className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}
      <span id={`${inputId}-status`} className="sr-only" aria-live="polite">
        {status}
      </span>
      {expanded ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-3xl border border-border/80 bg-background shadow-xl"
        >
          {suggestions.length && value.trim().length >= 2 ? (
            suggestions.map((suggestion, index) => {
              const content = (
                <>
                  <span className="font-medium text-foreground">{suggestion.term}</span>
                  <span className="text-xs text-muted">{suggestion.source}</span>
                </>
              );
              const className =
                `flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/10 ${activeIndex === index ? "bg-muted/10" : ""}`;
              const key = `${suggestion.source}-${suggestion.term}`;

              if (suggestion.href) {
                return (
                  <Link
                    key={key}
                    href={suggestion.href}
                    role="option"
                    aria-selected={activeIndex === index}
                    id={`${listboxId}-${index}`}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      dismissedRef.current = true;
                      setActiveIndex(-1);
                      setIsOpen(false);
                    }}
                    className={className}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  id={`${listboxId}-${index}`}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => submitSuggestion(suggestion)}
                  className={className}
                >
                  {content}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-sm text-muted">
              Pressione Enter para buscar por &quot;{value.trim()}&quot;.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
