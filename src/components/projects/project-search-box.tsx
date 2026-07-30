"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

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
  const [value, setValue] = React.useState(defaultValue);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [status, setStatus] = React.useState("");

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
        setStatus(
          payload.suggestions?.length
            ? `${payload.suggestions.length} sugestoes encontradas.`
            : "Nenhuma sugestao encontrada."
        );
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setStatus("Nao foi possivel carregar sugestoes agora.");
        }
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
    formRef.current = containerRef.current?.closest("form") ?? null;
  }, []);

  function submitSuggestion(suggestion: Suggestion) {
    setValue(suggestion.term);
    setIsOpen(false);
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  function updateSearchValue(nextValue: string) {
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
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        placeholder="Busque por Gol AP, orbital, daily, Civic K20..."
        className="pl-11 pr-10"
        autoComplete="off"
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && value.trim().length >= 2}
        aria-controls={listboxId}
        aria-describedby={`${inputId}-status`}
      />
      {isLoading ? (
        <Loader2
          className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted"
          aria-hidden="true"
        />
      ) : null}
      <span id={`${inputId}-status`} className="sr-only" aria-live="polite">
        {status}
      </span>
      {isOpen && value.trim().length >= 2 ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-3xl border border-border/80 bg-background shadow-xl"
        >
          {suggestions.length && value.trim().length >= 2 ? (
            suggestions.map((suggestion) => {
              const content = (
                <>
                  <span className="font-medium text-foreground">{suggestion.term}</span>
                  <span className="text-xs text-muted">{suggestion.source}</span>
                </>
              );
              const className =
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/10";
              const key = `${suggestion.source}-${suggestion.term}`;

              if (suggestion.href) {
                return (
                  <a
                    key={key}
                    href={suggestion.href}
                    role="option"
                    aria-selected="false"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setValue(suggestion.term);
                      setIsOpen(false);
                    }}
                    className={className}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected="false"
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
