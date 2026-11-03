"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const RobotHead = dynamic(
  () => import("robot-heads").then((module) => module.RobotHead),
  { ssr: false, loading: () => <span className="mascot-loading" aria-hidden="true" /> },
);

type RobotState =
  | "idle"
  | "thinking"
  | "searching"
  | "listening"
  | "speaking"
  | "working"
  | "happy"
  | "error"
  | "sleeping";

type ChatMessage = { role: "user" | "assistant"; content: string };

function completedConversation(source: ChatMessage[]): ChatMessage[] {
  const turns: ChatMessage[] = [];
  let pendingVisitor: ChatMessage | null = null;
  for (const message of source) {
    if (message.role === "user") {
      pendingVisitor = message;
    } else if (pendingVisitor) {
      turns.push(pendingVisitor, message);
      pendingVisitor = null;
    }
  }
  return turns.slice(-10);
}

function localAnswerFor(rawQuestion: string): { answer: string; openInquiry?: boolean } | null {
  const question = rawQuestion.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const asksForContact = /\b(contact|hire|quote|inquir|talk|start a project|work together)\b/.test(question);
  if (asksForContact) return { answer: "I can help prepare a project inquiry. Add your details in the form and review it before choosing to send it by email.", openInquiry: true };
  if (/\b(thesa)\b/.test(question)) return { answer: "Thesa is an in-progress AI thesis assistant that answers questions about uploaded documents and PDFs. Further implementation details haven’t been confirmed yet." };
  if (/\b(netpath)\b/.test(question)) return { answer: "NetPath is an in-progress networking learning web app with a simulation sandbox. Its specific topics and sandbox capabilities are still to be confirmed." };
  if (/\b(ai|artificial intelligence)\b/.test(question) && /\b(project|projects|use|integration)\b/.test(question)) return { answer: "The portfolio currently identifies JavaFX E-Commerce Tech Shop as having an AI integration and Thesa as an in-progress AI thesis assistant. More details about the shop integration have not been confirmed." };
  if (/\b(freelance|available|availability|internship|job)\b/.test(question)) return { answer: "The portfolio says the owner is available for freelance projects and is interested in internship and job opportunities." };
  if (/\b(service|services|offer|offers|pricing|price|cost|timeline|budget)\b/.test(question)) return { answer: "The services section currently shows small business websites, landing pages, and web apps as examples. These offers, prices, and timelines have not been finalized." };
  if (/\b(project|projects|portfolio|featured|work)\b/.test(question)) return { answer: "The portfolio currently features JavaFX E-Commerce Tech Shop (completed), Thesa (in progress), and NetPath (in progress)." };
  return null;
}
type LeadForm = {
  name: string;
  email: string;
  project_summary: string;
  budget_range: string;
  timeline: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_ASSISTANT_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const emptyLead: LeadForm = {
  name: "",
  email: "",
  project_summary: "",
  budget_range: "",
  timeline: "",
};

const QUICK_ANSWERS = [
  {
    question: "What projects are featured?",
    answer: "The portfolio currently features three projects: JavaFX E-Commerce Tech Shop (completed), Thesa (in progress), and NetPath (in progress).",
  },
  {
    question: "Which projects use AI?",
    answer: "JavaFX E-Commerce Tech Shop includes an AI integration, though its exact behavior isn’t documented yet. Thesa is an in-progress assistant for questions about uploaded documents and PDFs.",
  },
  {
    question: "What is Thesa?",
    answer: "Thesa is an in-progress AI thesis assistant that answers questions about uploaded documents and PDFs. More implementation details haven’t been confirmed yet.",
  },
  {
    question: "What is NetPath?",
    answer: "NetPath is an in-progress networking learning web app with a simulation sandbox. Its specific topics and sandbox capabilities are still to be confirmed.",
  },
  {
    question: "Is the owner available for freelance work?",
    answer: "The portfolio says the owner is available for freelance projects and is also interested in internship and job opportunities.",
  },
] as const;

export function ChatMascot() {
  const [open, setOpen] = useState(false);
  const [mascotState, setMascotState] = useState<RobotState>("sleeping");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [failedPrompt, setFailedPrompt] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadReview, setLeadReview] = useState(false);
  const [lead, setLead] = useState<LeadForm>(emptyLead);
  const [consent, setConsent] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const mascotButtonRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, reducedMotion]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      openRef.current = false;
      setOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      setMascotState("sleeping");
      mascotButtonRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function setStateFor(state: RobotState, afterMs?: number, nextState: RobotState = "idle") {
    if (!openRef.current && state !== "sleeping") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setMascotState(state);
    if (afterMs) timerRef.current = setTimeout(() => setMascotState(nextState), afterMs);
  }

  function togglePanel() {
    if (open) {
      openRef.current = false;
      setOpen(false);
      setStateFor("sleeping");
      return;
    }
    openRef.current = true;
    setOpen(true);
    setStateFor("happy", 850);
    window.setTimeout(() => openRef.current && panelRef.current?.focus(), 0);
  }

  async function askAssistant(content: string) {
    setBusy(true);
    setChatError("");
    setStateFor("searching", 360, "thinking");
    const requestMessages = [...completedConversation(messages), { role: "user" as const, content }];
    try {
      await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 360));
      if (openRef.current) setMascotState("thinking");
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || "I can’t connect right now. Please try again in a moment.");
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
      setFailedPrompt("");
      setStateFor("speaking", 1800);
    } catch (error) {
      const message = error instanceof Error ? error.message : "I can’t connect right now. Please try again in a moment.";
      setChatError(message);
      setFailedPrompt(content);
      setStateFor("error", 2400);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;

    setDraft("");
    setChatError("");
    setFailedPrompt("");
    const userMessage: ChatMessage = { role: "user", content };
    setMessages((current) => [...current, userMessage]);
    const localAnswer = localAnswerFor(content);
    if (localAnswer) {
      setMessages((current) => [...current, { role: "assistant", content: localAnswer.answer }]);
      if (localAnswer.openInquiry) setLeadOpen(true);
      setStateFor("speaking", 1800);
      return;
    }
    await askAssistant(content);
  }

  function retryLastMessage() {
    if (!failedPrompt || busy) return;
    void askAssistant(failedPrompt);
  }

  function startNewChat() {
    if (busy) return;
    setMessages([]);
    setDraft("");
    setChatError("");
    setFailedPrompt("");
    setLeadOpen(false);
    resetLead();
    setStateFor("idle");
  }

  function answerQuickQuestion(item: (typeof QUICK_ANSWERS)[number]) {
    setChatError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: item.question },
      { role: "assistant", content: item.answer },
    ]);
    setStateFor("speaking", 1300);
  }

  function updateLead(field: keyof LeadForm, value: string) {
    setLead((current) => ({ ...current, [field]: value }));
    setLeadError("");
  }

  function reviewLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadReview(true);
    setLeadError("");
    setStateFor("idle");
  }

  async function sendLead() {
    if (!consent || leadBusy) return;
    setLeadBusy(true);
    setLeadError("");
    setStateFor("working");
    try {
      const response = await fetch(`${API_BASE}/api/leads/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, consent_to_email: true, confirmed: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || "The inquiry could not be sent. Please try again later.");
      setLeadSent(true);
      setStateFor("happy", 2400);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : "The inquiry could not be sent. Please try again later.");
      setStateFor("error", 2600);
    } finally {
      setLeadBusy(false);
    }
  }

  function resetLead() {
    setLead(emptyLead);
    setConsent(false);
    setLeadReview(false);
    setLeadSent(false);
    setLeadError("");
  }

  return (
    <div className="chat-assistant">
      {open && (
        <section
          className="chat-panel"
          id="portfolio-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="portfolio-assistant-title"
          tabIndex={-1}
          ref={panelRef}
        >
          <header className="chat-panel-header">
            <div className="chat-heading-icon" aria-hidden="true">
              <RobotHead shape="rectangle" state={mascotState} size={54} color="#1c0b41" trimColor="#2a2c31" screenColor="#085e12" antenna paused={reducedMotion} />
            </div>
            <div className="chat-heading-copy">
              <h2 id="portfolio-assistant-title">Portfolio assistant</h2>
              <p><span className={`assistant-status-dot status-${mascotState}`} />{statusLabel(mascotState)}</p>
            </div>
            {messages.length > 0 && <button className="chat-new" type="button" onClick={startNewChat} disabled={busy} aria-label="Start a new chat">New chat</button>}
            <button className="chat-close" type="button" onClick={togglePanel} aria-label="Close assistant">×</button>
          </header>

          <div className="chat-content">
            {!leadOpen ? (
              <>
                <div className="chat-transcript" aria-live="polite" aria-label="Conversation">
                  <p className="chat-bubble assistant-bubble">Hi! Ask me about the projects, or tell me what you’re looking to build.</p>
                  {messages.length === 0 && (
                    <div className="chat-quick-questions" aria-label="Suggested questions with instant answers">
                      <p>Quick questions <span>Instant answers</span></p>
                      <div>
                        {QUICK_ANSWERS.map((item) => (
                          <button key={item.question} type="button" onClick={() => answerQuickQuestion(item)}>
                            {item.question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <p className={`chat-bubble ${message.role === "user" ? "user-bubble" : "assistant-bubble"}`} key={`${index}-${message.role}`}>
                      {message.content}
                    </p>
                  ))}
                  {busy && <p className="chat-bubble assistant-bubble chat-thinking" aria-label="Assistant is thinking"><span /><span /><span /></p>}
                  {chatError && <div className="chat-error-wrap" role="alert"><p className="chat-error">{chatError}</p>{failedPrompt && <button className="chat-retry" type="button" onClick={retryLastMessage} disabled={busy}>Try again</button>}</div>}
                  <div ref={messageEndRef} />
                </div>
                <form className="chat-compose" onSubmit={sendMessage}>
                  <label className="sr-only" htmlFor="assistant-message">Your message</label>
                  <input
                    id="assistant-message"
                    value={draft}
                    onFocus={() => !busy && setStateFor("listening")}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (!busy) setStateFor(event.target.value ? "listening" : "idle");
                    }}
                    maxLength={1200}
                    placeholder="Ask about the portfolio…"
                    autoComplete="off"
                  />
                  <button className="chat-send" type="submit" disabled={!draft.trim() || busy} aria-label="Send message">↑</button>
                </form>
                <button className="chat-inquiry-link" type="button" onClick={() => { setLeadOpen(true); setStateFor("idle"); }}>
                  Have a project in mind? <span>Send an inquiry ↗</span>
                </button>
              </>
            ) : (
              <div className="lead-flow">
                <div className="lead-flow-title">
                  <button className="lead-back" type="button" onClick={() => { setLeadOpen(false); resetLead(); }}>← Back to chat</button>
                  <h3>{leadSent ? "Inquiry sent" : leadReview ? "Review your inquiry" : "Tell me about your project"}</h3>
                  <p>{leadSent ? "Thanks. Your project brief was sent." : leadReview ? "Check these details before sending them." : "Share a few details and I’ll prepare a brief for review."}</p>
                </div>

                {leadSent ? (
                  <div className="lead-success">
                    <p>Your inquiry is on its way. You can close this panel or start a new inquiry.</p>
                    <button className="chat-secondary-button" type="button" onClick={resetLead}>Start another inquiry</button>
                  </div>
                ) : leadReview ? (
                  <div className="lead-review">
                    <dl>
                      <div><dt>Name</dt><dd>{lead.name}</dd></div>
                      <div><dt>Email</dt><dd>{lead.email}</dd></div>
                      <div><dt>Project needs</dt><dd>{lead.project_summary}</dd></div>
                      <div><dt>Budget range</dt><dd>{lead.budget_range || "Not provided"}</dd></div>
                      <div><dt>Timeline</dt><dd>{lead.timeline || "Not provided"}</dd></div>
                    </dl>
                    <label className="lead-consent">
                      <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                      <span>I agree to send this project brief to the portfolio owner by email.</span>
                    </label>
                    {leadError && <p className="chat-error" role="alert">{leadError}</p>}
                    <div className="lead-actions">
                      <button className="chat-secondary-button" type="button" onClick={() => setLeadReview(false)}>Edit details</button>
                      <button className="chat-primary-button" type="button" onClick={sendLead} disabled={!consent || leadBusy}>{leadBusy ? "Sending…" : "Confirm and send"}</button>
                    </div>
                  </div>
                ) : (
                  <form className="lead-form" onSubmit={reviewLead}>
                    <label>Name<input value={lead.name} onChange={(event) => updateLead("name", event.target.value)} maxLength={100} required /></label>
                    <label>Email<input type="email" value={lead.email} onChange={(event) => updateLead("email", event.target.value)} maxLength={254} required /></label>
                    <label>What are you looking to build?<textarea value={lead.project_summary} onChange={(event) => updateLead("project_summary", event.target.value)} minLength={20} maxLength={2500} rows={4} required /></label>
                    <div className="lead-optional-fields">
                      <label>Budget range <span>(optional)</span><input value={lead.budget_range} onChange={(event) => updateLead("budget_range", event.target.value)} maxLength={120} /></label>
                      <label>Timeline <span>(optional)</span><input value={lead.timeline} onChange={(event) => updateLead("timeline", event.target.value)} maxLength={120} /></label>
                    </div>
                    {leadError && <p className="chat-error" role="alert">{leadError}</p>}
                    <button className="chat-primary-button" type="submit">Review inquiry</button>
                    <p className="lead-privacy-note">Nothing is emailed until you review the summary and confirm.</p>
                  </form>
                )}
              </div>
            )}
          </div>
          <p className="chat-footer-note">Your message is sent to the AI service for a reply. Don’t share sensitive information.</p>
        </section>
      )}

      <button
        className={`chat-mascot-button${open ? " is-open" : ""}`}
        ref={mascotButtonRef}
        type="button"
        aria-label={open ? "Close portfolio assistant" : "Open portfolio assistant"}
        aria-expanded={open}
        aria-controls="portfolio-assistant-panel"
        onClick={togglePanel}
      >
        <span className="mascot-aura" aria-hidden="true" />
        <RobotHead
          shape="rectangle"
          state={mascotState}
          size={104}
          color="#1c0b41"
          trimColor="#2a2c31"
          screenColor="#085e12"
          antenna
          floorShadow
          interactive
          paused={reducedMotion}
          aria-hidden="true"
          className="chat-mascot-canvas"
        />
      </button>
    </div>
  );
}

function statusLabel(state: RobotState): string {
  const labels: Record<RobotState, string> = {
    idle: "Ready to chat",
    thinking: "Thinking",
    searching: "Checking portfolio info",
    listening: "Listening",
    speaking: "Replying",
    working: "Sending your inquiry",
    happy: "Here to help",
    error: "Needs a moment",
    sleeping: "Resting",
  };
  return labels[state];
}
