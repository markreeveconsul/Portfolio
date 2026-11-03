"use client";

import { useState, type FormEvent } from "react";

export function ContactForm({ configured }: { configured: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("Sending your message…");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const response = await fetch("/api/contact", { method: "POST", body: JSON.stringify(Object.fromEntries(fields)), headers: { "Content-Type": "application/json" } });
      const data: { message?: string } = await response.json();
      if (!response.ok) throw new Error(data.message || "We couldn’t send that message.");
      form.reset();
      setStatus("success");
      setMessage(data.message || "Thanks — your message has been sent.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (!configured) return <div className="contact-unavailable" role="status">Message delivery is not configured yet. This form will be available once email delivery is connected.</div>;

  return <form className="contact-form" onSubmit={handleSubmit}>
    <label className="field-label">Your name<input autoComplete="name" name="name" required maxLength={100} placeholder="Name" /></label>
    <label className="field-label">Your email<input autoComplete="email" name="email" type="email" required maxLength={254} placeholder="you@example.com" /></label>
    <label className="field-label">Message<textarea name="message" required minLength={10} maxLength={4000} placeholder="Tell me a little about what you have in mind…" /></label>
    <button className="button button-primary" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send message"} <span aria-hidden="true">↗</span></button>
    <p className="form-message" data-state={status} role="status" aria-live="polite">{message}</p>
  </form>;
}
