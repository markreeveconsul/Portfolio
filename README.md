# Personal portfolio

A responsive portfolio built with Next.js App Router, TypeScript, Tailwind CSS, and Framer Motion. Phase 2 adds a client-loaded 3D ID card with a physics lanyard, pointer dragging, and a CSS fallback for small screens, reduced-motion preferences, and unsupported WebGL.

## Run locally

1. Install Node.js 20.9 or newer.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Open `http://localhost:3000`.

The contact form validates messages locally. To deliver messages, copy `.env.example` to `.env.local`, set `FORMSPREE_ENDPOINT` to your own Formspree form endpoint, and restart the server. Do not commit `.env.local`.

## Build and run production

1. Run `npm run build`.
2. Run `npm run start`.

## Deploy on Vercel

Import the repository into Vercel and deploy it as a Next.js project. Add `FORMSPREE_ENDPOINT` in Vercel project environment variables if you want the contact form to deliver email. Set `NEXT_PUBLIC_SITE_URL` to the canonical site URL for sitemap and robots metadata.

## Update portfolio content

- Profile, contact links, and personal details: `src/data/profile.ts`
- Project copy, status, public technologies, features, and links: `src/data/projects.ts`
- Certificates and image paths: `src/data/certificates.ts`
- Public languages and frameworks only: `src/data/techstack.ts`
- Services and process descriptions: `src/data/services.ts`
- Replace original image placeholders in `public/images/` with your own project previews, portrait, and social preview.

AI tools and model details are deliberately omitted from the public tech stack. Facts that still need your confirmation remain marked `[TODO]`.
## Portfolio assistant backend

The optional FastAPI service lives in `backend/`. It exposes `GET /health`, `POST /api/chat`, and `POST /api/leads/confirm`. Chat requests are stateless: the browser may send a short bounded transcript, and the service does not save it. Gemini requests set `store: false`. Lead emails are sent only after the visitor opts in and confirms the final summary; email content contains the structured inquiry, not the chat transcript.

To run locally, create a virtual environment in `backend/.venv`, install `backend/requirements.txt`, copy `backend/.env.example` to `backend/.env`, and set your private Gemini key there. You can also add a Groq key to enable a delayed backup: Gemini starts first, and Groq starts after `AI_FALLBACK_DELAY_SECONDS` if Gemini has not answered or fails. The first successful answer is returned. Set both keys only in the backend environment file; never expose them in frontend code. Start the service from `backend/` with `python -m uvicorn app.main:app --reload --port 8000`. Lead delivery remains disabled until the private SMTP and recipient settings are configured. Set `PORTFOLIO_ORIGINS` to the exact frontend origins you use.

The chatbot retrieves relevant entries from a small local portfolio knowledge base before calling a provider. Suggested questions in the panel use fixed approved answers locally and do not call an AI provider. When the delayed Groq fallback is triggered, the visitor’s recent chat and the same approved portfolio context are sent to Groq too; make this clear in the panel privacy note. Update `KNOWLEDGE_BASE` in `backend/app/main.py` when public project details are confirmed.
