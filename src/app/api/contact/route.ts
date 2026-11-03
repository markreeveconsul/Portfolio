import { NextResponse } from "next/server";

type ContactPayload = { name?: unknown; email?: unknown; message?: unknown };

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = await request.json() as ContactPayload;
  } catch {
    return NextResponse.json({ message: "Please submit a valid message." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || message.length < 10 || message.length > 4000) {
    return NextResponse.json({ message: "Please check your name, email, and message, then try again." }, { status: 400 });
  }

  const endpoint = process.env.FORMSPREE_ENDPOINT;
  if (!endpoint) return NextResponse.json({ message: "The contact form is not connected yet. Please use the social links or email once those are added." }, { status: 503 });
  if (!endpoint.startsWith("https://formspree.io/f/")) return NextResponse.json({ message: "The contact form endpoint is not configured correctly." }, { status: 503 });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name, email, message }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ message: "The message could not be delivered. Please try again later." }, { status: 502 });
    return NextResponse.json({ message: "Thanks — your message has been sent." });
  } catch {
    return NextResponse.json({ message: "We couldn’t reach the message service. Please try again later." }, { status: 502 });
  }
}
