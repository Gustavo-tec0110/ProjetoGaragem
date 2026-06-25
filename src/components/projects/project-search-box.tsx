"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type Suggestion = {
  term: string;
  source: string;
};

export function ProjectSearchBox({
  defaultValue,
}: {
  defaultValue: string;
}) {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [value, setValue] = React.useState(defaultValue);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
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
        const payload = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(payload.suggestions ?? []);
        setIsOpen(true);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [value]);

  React.useEffect(() => {
    formRef.current = document.querySelector("form[data-project-search-form]");
  }, []);

  function submitSuggestion(term: string) {
    setValue(term);
    setIsOpen(false);
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  return (
    <label className="relative">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        placeholder="Busque por Gol AP, orbital, daily, Civic K20..."
        className="pl-11 pr-10"
        autoComplete="off"
      />
      {isLoading ? (
        <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
      ) : null}
      {isOpen && value.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-3xl border border-border/80 bg-background shadow-xl">
          {suggestions.length && value.trim().length >= 2 ? (
            suggestions.map((suggestion) => (
              <button
                key={`${suggestion.source}-${suggestion.term}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submitSuggestion(suggestion.term)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/10"
              >
                <span className="font-medium text-foreground">{suggestion.term}</span>
                <span className="text-xs text-muted">{suggestion.source}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-muted">
              Pressione Enter para buscar por &quot;{value.trim()}&quot;.
            </div>
          )}
        </div>
      ) : null}
    </label>
  );
}
