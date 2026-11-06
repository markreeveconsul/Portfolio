"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { BOOT_STORAGE_KEY } from "@/lib/boot";
import { scrollToSection, setScrollLock } from "@/lib/motion";

export const OPEN_PALETTE_EVENT = "portfolio:open-palette";

type Command = {
  id: string;
  group: "Navigate" | "Projects" | "Links" | "System";
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

const SECTIONS = [
  { id: "home", label: "Intro", keywords: "top hero start" },
  { id: "about", label: "About", keywords: "bio me profile" },
  { id: "portfolio", label: "Work", keywords: "projects portfolio certificates tech stack" },
  { id: "github", label: "GitHub activity", keywords: "commits repos code open source" },
  { id: "services", label: "Services", keywords: "hire freelance help" },
  { id: "contact", label: "Contact", keywords: "email message hire reach" },
];

/** Subsequence match with a bonus for consecutive and word-start hits. Higher is better; -1 is no match. */
function score(query: string, text: string) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct >= 0) return 100 - direct + (direct === 0 || t[direct - 1] === " " ? 20 : 0);
  let total = 0;
  let position = -1;
  let streak = 0;
  for (const char of q) {
    const next = t.indexOf(char, position + 1);
    if (next < 0) return -1;
    streak = next === position + 1 ? streak + 1 : 0;
    total += 1 + streak * 2 + (next === 0 || t[next - 1] === " " ? 3 : 0);
    position = next;
  }
  return total;
}

/**
 * Terminal-style command palette (Ctrl/⌘ + K, or the navbar button). Jump to a
 * section, open a project, follow a link, or replay the boot intro. Built as an
 * ARIA combobox: the input keeps focus and arrow keys move the active option.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => returnFocus.current?.focus?.());
  }, []);

  const commands = useMemo<Command[]>(() => {
    const goToSection = (id: string) => {
      if (pathname === "/") { scrollToSection(id); history.replaceState(null, "", `#${id}`); }
      else router.push(`/#${id}` as Route);
    };
    const list: Command[] = SECTIONS.map((section) => ({ id: `section-${section.id}`, group: "Navigate", label: section.label, hint: `#${section.id}`, keywords: section.keywords, run: () => goToSection(section.id) }));
    for (const project of projects) list.push({ id: `project-${project.slug}`, group: "Projects", label: project.name, hint: project.status, keywords: `${project.eyebrow} ${project.technologies.join(" ")}`, run: () => router.push(`/portfolio/${project.slug}` as Route) });
    if (profile.github.startsWith("https://")) list.push({ id: "link-github", group: "Links", label: "Open GitHub profile", hint: "github.com", keywords: "code repos source", run: () => window.open(profile.github, "_blank", "noopener,noreferrer") });
    if (profile.linkedin.startsWith("https://")) list.push({ id: "link-linkedin", group: "Links", label: "Open LinkedIn", hint: "linkedin.com", run: () => window.open(profile.linkedin, "_blank", "noopener,noreferrer") });
    if (profile.email.includes("@")) {
      list.push({ id: "link-email", group: "Links", label: "Send an email", hint: profile.email, keywords: "mail contact", run: () => { window.location.href = `mailto:${profile.email}`; } });
      list.push({ id: "copy-email", group: "Links", label: "Copy email address", hint: copied ? "Copied" : profile.email, keywords: "clipboard", run: () => { navigator.clipboard?.writeText(profile.email).then(() => setCopied(true)); } });
    }
    list.push({ id: "system-boot", group: "System", label: "Replay boot intro", hint: "reboot", keywords: "intro animation arch restart", run: () => { try { sessionStorage.removeItem(BOOT_STORAGE_KEY); } catch { /* private mode */ } window.location.assign("/"); } });
    list.push({ id: "system-top", group: "System", label: "Back to top", hint: "home", keywords: "scroll up", run: () => goToSection("home") });
    return list;
  }, [pathname, router, copied]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return commands;
    return commands
      .map((command) => ({ command, value: Math.max(score(trimmed, command.label) * 2, score(trimmed, `${command.keywords ?? ""} ${command.group}`)) }))
      .filter((entry) => entry.value >= 0)
      .sort((a, b) => b.value - a.value)
      .map((entry) => entry.command);
  }, [commands, query]);

  // Global shortcut and the navbar button.
  useEffect(() => {
    const openPalette = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActive(0);
      setCopied(false);
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (open) close(); else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, openPalette);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_PALETTE_EVENT, openPalette); };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    setScrollLock(true);
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => { setScrollLock(false); html.style.overflow = previous; };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runCommand = (command: Command | undefined) => {
    if (!command) return;
    const keepOpen = command.id === "copy-email";
    if (!keepOpen) setOpen(false);
    command.run();
  };

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => (results.length ? (index + 1) % results.length : 0)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => (results.length ? (index - 1 + results.length) % results.length : 0)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(Math.max(0, results.length - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); runCommand(results[active]); }
    else if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "Tab") event.preventDefault(); // focus stays in the dialog
  };

  if (!open) return null;

  let lastGroup = "";
  return <div className="palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} data-lenis-prevent="">
    <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="palette-input-row">
        <span className="palette-prompt" aria-hidden="true">mark@consul:~$</span>
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-autocomplete="list"
          aria-label="Type a command or search"
          placeholder="type a command or search…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKey}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="palette-esc">esc</kbd>
      </div>
      <ul ref={listRef} id={listId} className="palette-list" role="listbox" aria-label="Commands">
        {results.length === 0 && <li className="palette-empty" role="presentation">command not found: <b>{query}</b></li>}
        {results.map((command, index) => {
          const heading = command.group !== lastGroup && !query.trim() ? command.group : "";
          lastGroup = command.group;
          return <li key={command.id} role="presentation">
            {heading && <span className="palette-group" aria-hidden="true">{heading}</span>}
            <div
              id={`${listId}-${command.id}`}
              role="option"
              aria-selected={index === active}
              data-index={index}
              className={`palette-option${index === active ? " is-active" : ""}`}
              onMouseMove={() => { if (index !== active) setActive(index); }}
              onClick={() => runCommand(command)}
            >
              <span className="palette-caret" aria-hidden="true">›</span>
              <span className="palette-label">{command.label}</span>
              {command.hint && <span className="palette-hint">{command.hint}</span>}
            </div>
          </li>;
        })}
      </ul>
      <div className="palette-footer" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> run</span><span><kbd>esc</kbd> close</span></div>
    </div>
  </div>;
}
