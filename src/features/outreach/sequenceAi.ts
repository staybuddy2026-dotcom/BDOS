import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getSenderIdentity } from '@/lib/sender';
import { SettingsService } from '@/lib/settings';
import { AuthService } from '@/lib/auth';
import type { Company360Profile } from '../company360/types';
import type { FollowupStage, OutreachChannel, SequenceStepDraft, ToneSetting } from './types';

/**
 * AI 4-Stage Outreach Sequence Engine.
 * Generates the Email / LinkedIn DM sequence (relevance -> new angle -> bottleneck + proof -> close the loop)
 * with Gemini, then enforces the hard copywriting rules in code and repairs any stage that breaks them.
 */

const STAGE_IDS: FollowupStage[] = ['STAGE_1_INITIAL', 'STAGE_2_FOLLOWUP', 'STAGE_3_VALUE_ADD', 'STAGE_4_BREAKUP'];

// LinkedIn caps connection request notes at 300 characters (200 on some free accounts).
export const LINKEDIN_NOTE_LIMIT = 300;

// Names used to verify that "proof_used" really comes from the portfolio (no invented projects).
const PORTFOLIO_ITEMS = [
  'Himba Shoes', 'SEYDI Paris', 'Tredo', 'Cofinex', 'Hotel Hedonia', 'Murb', 'Condominium Portal',
  'Huntpur', 'Swarn Sathi', 'Wellwalla', 'FunGuyz', 'AutoAid',
  'Indian Railway', 'lip sync', 'Stable Diffusion', 'greenhouse', 'news sentiment',
  'financial chatbot', 'no-code computer vision', 'traffic monitoring', 'investor behaviour', 'motion-sensor',
  'motion sensor', 'CCTV', 'LiDAR', 'garbage-detection', 'garbage detection', 'water-usage', 'water usage',
  'elevator', 'site-plan', 'site plan',
  'Nymora', 'Ecogreenz', 'Neujin', 'Sawaca', 'Afro House', 'Globofarm', 'MahaaRajaa',
  'Bainbridge Pickleball', 'Anand Niketan', 'Easypharmacy',
];

export const buildSystemPrompt = (senderNameOrProfile: string, maybeRole?: string) => {
  let senderName = (senderNameOrProfile || '').trim();
  let senderRole = (maybeRole || '').trim();
  if (!senderRole && senderName.includes(',')) {
    const parts = senderName.split(',').map((p) => p.trim());
    senderName = parts[0];
    senderRole = parts.slice(1).join(', ');
  }
  if (!senderName) senderName = 'our team member';
  if (!senderRole) senderRole = 'Business Development';

  return `You write LinkedIn direct messages and short emails for cold outreach on behalf of ${senderName}, ${senderRole} at TinyScript (Tiny Script Soft Tech Pvt. Ltd.), a software development, AI/automation and digital marketing execution partner for startups, SMEs and agencies across the US, Europe and India. 

Your job is not to sell. Your job is to start a real business conversation that a busy founder or decision maker would actually want to reply to. Before writing anything, silently check: "Would a real person in this position want to reply to this?" If not, rewrite it before returning output. 

## INPUTS 
- prospect_name, prospect_role, prospect_company, prospect_bio: whatever is known about the prospect 
- prospect_signals: optional extra info (recent posts, hiring, launches, funding, news) 
- stage: the current message number in this campaign (e.g. 1, 2, 3...) 
- total_stages: how many messages this campaign sequence has in total (e.g. 3, 4, or 5) 
- thread_history: messages already sent in this sequence (empty when stage is 1) 
- language: write in the prospect's language, matching the language already used in thread_history if any 

## HOW TO TREAT THE STAGE NUMBER 
If stage equals total_stages, this is the FINAL message — always follow the STAGE FINAL rules below regardless of what number it is. 
If stage is 1, follow STAGE 1 rules. 
If stage is anywhere between 2 and (total_stages - 1), follow STAGE MIDDLE rules — every one of these messages must introduce a genuinely new angle not used in any earlier message in thread_history, whether it's message 2, 3, or 4 of a longer sequence. Only bring in the bottleneck-plus-proof approach (see below) at the second-to-last middle message, not earlier ones, so the sequence still moves curiosity → value → proof → close in order however many messages it has. 

## STAGE 1 — Relevance and curiosity 
Show a real reason for reaching out, built from something specific in prospect_bio or prospect_signals. If a question fits naturally, ask exactly one open question about how that area of their business is going. Never phrase it as a choice between two guessed options. No pitch, no service mention, no company introduction. 

## STAGE MIDDLE — New angle, real value (all messages between first and last) 
Never write "just following up", "checking in" or "any thoughts". Add something genuinely new: a different observation, a realistic scenario, a useful consideration, or a fresh question not asked before in thread_history. It should be worth reading even if the prospect never replies. Do not mention TinyScript or the sender's team in these messages, except in the one designated bottleneck-and-proof message described below. 

### The bottleneck-and-proof message (the second-to-last message in the sequence) 
State a possible bottleneck as a hypothesis only ("one thing that can become a bottleneck at this stage is..."), never as a fact about the prospect. Then check the PORTFOLIO section below for a genuinely similar project (same industry, same problem type, or same business model). If a real match exists, connect it in this order: situation → relevant experience → what was built or learned. If nothing in the portfolio is a genuine match, keep the proof line general and honest, or omit proof entirely. Never invent a project, client, result or number not present in the portfolio below. 

## STAGE FINAL — Close the loop 
Two to three short sentences only. Do not restate or summarize the prospect's business again. Do not hint at a future need or opportunity. Use a varied opening phrase (rotate across: "I'll leave it here for now", "No worries either way", "I'll stop here", "Understood", "I'll wrap up here", "No pressure at all") followed by one light, human line, then a short well wish naming prospect_company. Never use "please let me know", "would love to connect", "hope to hear from you", or anything implying a future ask. 

## HARD CONSTRAINTS — apply to every stage 
- Never invent a problem. Every observation is a hypothesis, not a stated fact about the prospect. 
- Never assume growth means hiring, hiring means permanent hiring, or expansion means needing outside help. 
- Never imply the prospect's current setup (team, vendor, agency, recruiter) is wrong or inadequate. 
- Every message must be built from real, specific input about this prospect. If it could be sent to 100 different companies by only swapping the name, it is not specific enough — rewrite it. 
- If prospect_bio and prospect_signals are too thin to write something genuinely specific, do not pad with generic sales language. Set confidence to "low" and state exactly what information is missing. 
- No forced call to action. A reply, a small insight, or an open door are all valid outcomes. Never ask for a meeting except possibly in the final message, and even then only if it fits naturally — never as a default. 
- No fear, urgency, flattery, or fake compliments. Never name or expose any persuasion technique inside the message text. 
- No buzzwords, no marketing language, no exclamation marks, no emojis, no em dashes or hyphens used as punctuation. 
- Never list technologies, years of experience, client counts, or generic credentials as proof. 

## VOICE 
Conversational, like one founder or professional writing to another — not polished corporate English. Use "I" and "my team". Prefer natural, slightly informal phrasing over sophisticated vocabulary. Human beats polished. Specific beats impressive. 

## LENGTH 
40 to 75 words for all messages except the final one, never above 90. Must read in under 15 seconds — four short lines maximum, one central idea per message. The final message should run shorter, roughly 25 to 45 words. 

## PORTFOLIO — the only proof you may use in the bottleneck-and-proof message 
Present partner work as "my team" or "our sister company that handles that niche for our clients." Never claim results or numbers that are not written below. 

TinyScript direct work: Himba Shoes (fashion/shoes ecommerce site, France); SEYDI Paris (Shopify ethical fashion store, France); Tredo (trading app, Apple App Store); Cofinex (fintech mobile app — one of our developers built this at his previous company); Hotel Hedonia (luxury hotel site with room, restaurant and banquet booking); Murb (all-sports activity and venue booking platform); Condominium Portal (condominium management platform); also delivered work for Huntpur, Swarn Sathi, Wellwalla, FunGuyz, AutoAid. 

AI partner work (via our AI development partner): computer vision system for Indian Railway (pantograph, cable, and open-door monitoring); interactive video generation with real-time lip sync; Stable Diffusion character transformation platform; greenhouse insect-tracking chatbot on a knowledge graph; news sentiment and stock-signal system; generative AI financial chatbot (OpenAI, LangChain); no-code computer vision platform (Kubernetes, Triton, TensorRT); government traffic monitoring on NVIDIA Jetson (YOLOv8); investor behaviour analysis agent (CrewAI, LangChain); motion-sensor false-positive reduction via object detection; low-bandwidth CCTV using LiDAR; garbage-detection segmentation model; household water-usage and leak-detection ML system; elevator parts-identification system with image similarity and SAP integration; civil site-plan approval automation with OCR and segmentation. 

Marketing partner work (via our marketing partner): brand identity systems (e.g. Nymora salon); SEO and local SEO/GMB; social media systems; LinkedIn management; performance marketing; packaging design; website design. Clients include Ecogreenz, Neujin Solutions, Sawaca Enterprises, Afro House, Globofarm, MahaaRajaa, Bainbridge Pickleball, Anand Niketan, Easypharmacy UK. 

Match on genuine similarity only (same industry, same problem type, or same business model as the prospect). A loose or forced match is worse than no match at all. 

## OUTPUT FORMAT 
Return only valid JSON, no text before or after it, no markdown code fences: 
{ 
  "message": "the message text, written in the prospect's language", 
  "stage": 1, 
  "confidence": "high", 
  "proof_used": "portfolio item name, or none", 
  "missing_info": "what additional prospect info would make this more specific, or empty string if none" 
}`;
};

// Tone buttons only nudge emphasis; they never override the hard rules above.
const TONE_HINTS: Record<ToneSetting, string> = {
  EXECUTIVE: 'Keep it extra brief and focused on business direction rather than execution detail.',
  TECHNICAL: 'Lean slightly towards the product and engineering side of their business, still without listing technologies.',
  FRIENDLY: 'Slightly warmer and more relaxed wording, still no flattery.',
  CONSULTATIVE: 'Lean on genuine questions and listening before offering any view.',
  PAS_FRAMEWORK: 'In stage 3, give the bottleneck hypothesis a little more space, framed calmly, never as fear.',
  ROI_FOCUSED: 'Where it fits, frame considerations around time and cost tradeoffs, without any numbers or claims.',
  CHALLENGER: 'Offer one fresh perspective they may not have considered, without implying their current setup is wrong.',
};

const channelInstructions = (channel: OutreachChannel, firstName: string) => {
  const greeting = firstName ? `a natural greeting with their first name "${firstName}" on its own first line` : 'a natural short greeting on its own first line (the name is unknown)';
  if (channel === 'LINKEDIN') {
    return `CHANNEL: LinkedIn.
- Message 1 is sent as a connection request note, so it MUST be at most ${LINKEDIN_NOTE_LIMIT - 20} characters in total, greeting included. One or two short sentences.
- Messages 2 to 4 are direct messages after they accept: at most 60 words each, shorter than an email, chat-like.
- Each message starts with ${greeting}. No sign off and no signature.
- The "subject" is a 2 to 5 word title, only used if a message is sent as an InMail. Write company names with their normal capitalisation.`;
  }
  return `CHANNEL: Short cold email. Each message starts with ${greeting}. Do NOT add a sign off or signature, it is appended automatically. The "subject" is 2 to 5 plain words about a specific topic from the prospect section (not "your background" or "your profile"), no pitch, no clickbait, no company name of ours, no dashes. Write company names with their normal capitalisation.`;
};

const stepSchema = z.object({
  stage: z.coerce.number().int().min(1).max(4),
  message: z.string().trim().min(10),
  confidence: z.string().transform((v) => (v.toLowerCase() === 'high' ? 'high' : 'low') as 'high' | 'low'),
  proof_used: z.string().optional().default('none'),
  missing_info: z.string().optional().default(''),
});

const sequenceSchema = z.object({
  language: z.string().optional().default('English'),
  subject: z.string().trim().min(2),
  messages: z.array(stepSchema).min(4),
});

type RawStep = z.infer<typeof stepSchema>;

type Sender = { name: string; role: string };

async function getSender(): Promise<Sender> {
  // Each team member signs their own outreach. The workspace signature setting ("Name | Role | ...")
  // only supplies the role for the admin it describes.
  const { name } = await getSenderIdentity();
  const user = await AuthService.getCurrentUser().catch(() => null);
  const [, role] = (await SettingsService.get('defaultSignature', '')).split('|').map((p) => p.trim());
  return { name, role: user?.role === 'ADMIN' && role ? role : 'Business Development' };
}

/**
 * Turns the Company 360 profile into factual prospect input. Deliberately excludes our own
 * inferred scores/pitches (outsourcing probability, recommended pitch) so the model cannot
 * mistake our guesses for facts about the prospect.
 */
export function buildProspectContext(profile: Company360Profile, researchNotes?: string): { text: string; firstName: string; isThin: boolean } {
  const dm = profile.decisionMakers?.[0];
  const rawName = dm?.name || '';
  const isGeneric = !rawName || /engineering lead|decision maker|executive/i.test(rawName);
  const firstName = isGeneric ? '' : rawName.split(' ')[0].replace(/[^\p{L}]/gu, '');
  const o = profile.overview;
  const lines: string[] = [];

  // Apollo masks surnames ("Ja***n"): pass only the first name so it is never used in a message.
  const displayName = isGeneric ? 'unknown' : /\*/.test(rawName) ? `${firstName} (surname hidden by the data source)` : rawName;
  lines.push(`prospect_name: ${displayName}`);
  lines.push(`prospect_role: ${dm?.jobTitle || 'unknown'} (current title only; nothing is known about how long they have held it)`);
  lines.push(`prospect_company: ${o.companyName} (${o.domain})`);

  const bioDetails: string[] = [];
  if (o.industry) bioDetails.push(`Industry: ${o.industry}`);
  if (o.headquarters) bioDetails.push(`Location: ${o.headquarters}`);
  if (o.employeeRange || o.employeeCount) bioDetails.push(`Size: ${o.employeeRange || o.employeeCount + ' employees'}`);
  if (o.companyDescription) bioDetails.push(`Company background: ${o.companyDescription}`);
  const notes = researchNotes?.trim().slice(0, 2000);
  if (notes) bioDetails.push(`Research notes: ${notes}`);

  lines.push(`prospect_bio: ${bioDetails.length ? bioDetails.join(' | ') : 'none available'}`);

  const signals: string[] = [];
  const li = profile.linkedin;
  if (li) {
    const posts = [li.primaryPost, ...(li.recentPosts || [])].filter(Boolean);
    const seen = new Set<string>();
    posts.slice(0, 5).forEach((p) => {
      if (!p?.contentSnippet || seen.has(p.contentSnippet)) return;
      seen.add(p.contentSnippet);
      signals.push(`LinkedIn post by ${p.authorName} (${p.publishedDate}): "${p.contentSnippet}"`);
    });
    (li.jobOpenings || []).slice(0, 4).forEach((j) => signals.push(`Open role: ${j.title} (${j.employmentType}, ${j.location}, posted ${j.postedDate})`));
    if (!li.jobOpenings?.length && li.activeJobOpeningsCount) signals.push(`Open job listings: ${li.activeJobOpeningsCount}`);
  }
  const g = profile.growth;
  if (g) {
    // Profiles can carry partial growth data; skip placeholders like "Undisclosed" / missing dates.
    if (g.latestRoundName && !/undisclosed/i.test(g.latestRoundName)) {
      signals.push(`Funding: ${g.latestRoundName}${g.latestRoundDate ? ` announced ${g.latestRoundDate}` : ''}`);
    }
    (g.expansionSignals || []).slice(0, 3).forEach((s) => signals.push(`News: ${s.title}. ${s.description}`));
  }
  const ph = profile.productHunt?.primaryProduct;
  if (ph) signals.push(`Product launch: ${ph.name}, "${ph.tagline}" (${ph.launchDate}). ${ph.description}`);

  lines.push(signals.length ? `prospect_signals:\n${signals.map((s) => `- ${s}`).join('\n')}` : 'prospect_signals: none');
  // "Thin" = nothing specific to write about beyond name, title and company.
  const isThin = !notes && !o.companyDescription && signals.length === 0;
  return { text: lines.join('\n'), firstName, isThin };
}

// Stays inside the user's rules; makes explicit what "real information" means for this run.
const GROUNDING_RULES = `GROUNDING (applies to every message, on top of the rules above):
- State only facts that appear in the prospect section. Never infer tenure, career history, achievements, team size, what they "work on", their challenges or their plans.
- Company facts (industry, size, description) describe the company. Do not present them as the person's own work.
- A hypothesis must be clearly framed as one ("one thing that can become a bottleneck at this stage is..."), never as something you "noticed" or "saw".
- If prospect_bio and prospect_signals have no research notes, no company description and no signals, keep Message 1 to an honest, simple reason for reaching out based only on their role and company, set confidence to "low", and name the exact information that is missing.
- Portfolio proof: describe a project only with what its portfolio line says. Never add features, workflows, results, timelines or lessons learned that are not written there. Clients listed without a description (Huntpur, Swarn Sathi, Wellwalla, FunGuyz, AutoAid and marketing partner clients) may be named but not described.
- Never open a message with "following up" in any form.`;

// ---------- Rule enforcement ----------

export function sanitizeMessage(text: string, protectedWords: string[] = []): string {
  let out = text.replace(/\r\n/g, '\n');
  out = out.replace(/\p{Extended_Pictographic}️?/gu, '');
  out = out.replace(/!+/g, '.');
  out = out.replace(/\s+[—–-]+\s+/g, ', ');
  out = out.replace(/[—–]/g, ', ');
  // Hyphenated words ("follow-up") become spaced, except names we must not alter (e.g. "Coca-Cola").
  out = out.replace(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu, (word) =>
    protectedWords.some((p) => p.toLowerCase() === word.toLowerCase()) ? word : word.replace(/-/g, ' ')
  );
  out = out.replace(/,\s*,/g, ',').replace(/\s+([,.?])/g, '$1').replace(/\.{2,}/g, '.');
  out = out.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n');
  // Greeting on its own line: "Bill, I was looking..." -> "Bill,\n\nI was looking..."
  const firstWord = (out.match(/^[\p{L}']+/u)?.[0] || '').toLowerCase();
  const greetingWords = ['hi', 'hello', 'hey', 'dear', 'bonjour', 'salut', 'ciao', 'buongiorno', 'hola', 'hallo', 'hei', 'moi', 'hej', 'olá', 'ola'];
  if (greetingWords.includes(firstWord) || protectedWords.some((p) => p.toLowerCase() === firstWord)) {
    out = out.replace(/^((?:\S+\s){0,2}\S+,)[ \t]+(?=\S)/u, '$1\n\n');
  }
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  // Each paragraph after the greeting starts with a capital letter.
  out = out.replace(/\n\n(\p{Ll})/gu, (_m, c: string) => `\n\n${c.toUpperCase()}`);
  if (out && !/[.?]$/.test(out)) out += '.';
  return out;
}

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

const BANNED_PHRASES = [
  'just following up', 'just checking in', 'checking in', 'any thoughts', 'please let me know', 'would love to connect',
  'hope to hear from you', 'one last time', 'hope you are doing well', "hope you're doing well", 'hope this email finds you',
  'leading software company', 'we specialize in', 'circle back', 'touch base', 'synergy', 'game changer', 'cutting edge',
];

// Phrases that claim first-hand knowledge the data never contains (the source of "your long tenure").
// ("I saw your post" is fine when the post is in the research notes; the fact check judges those.)
const PRESUMPTIVE_PHRASES = /\b(long tenure|your tenure|your journey|your years (at|with)|impressive (work|career|background)|you(?:'ve| have) been (leading|building|working) (on|at|for) )/i;

// Portfolio clients listed by name only: any "what we did for them" would be invented.
const NAME_ONLY_CLIENTS = ['Huntpur', 'Swarn Sathi', 'Wellwalla', 'FunGuyz', 'AutoAid', 'Ecogreenz', 'Neujin', 'Sawaca', 'Afro House', 'Globofarm', 'MahaaRajaa', 'Bainbridge Pickleball', 'Anand Niketan', 'Easypharmacy'];

export function findRuleViolations(step: RawStep, channel: OutreachChannel = 'EMAIL', totalStages: number = 4): string[] {
  const issues: string[] = [];
  const msg = step.message;
  const lower = msg.toLowerCase();
  const words = countWords(msg);
  const isLinkedIn = channel === 'LINKEDIN';
  const isFinal = step.stage === totalStages;
  const maxWords = isFinal ? 45 : isLinkedIn ? 60 : 90;

  if (isLinkedIn && step.stage === 1 && msg.length > LINKEDIN_NOTE_LIMIT) {
    issues.push(`too long for a LinkedIn connection note (${msg.length} characters, max ${LINKEDIN_NOTE_LIMIT})`);
  } else if (words > maxWords) {
    issues.push(`too long (${words} words, max ${maxWords})`);
  }
  // Emails that are too thin read as template spam; LinkedIn notes are meant to be short.
  if (!isLinkedIn && !isFinal && words < 28) issues.push(`too thin (${words} words, aim for 40 to 75)`);
  if (PRESUMPTIVE_PHRASES.test(msg)) issues.push('claims personal knowledge about the prospect that the data does not contain');
  // The body (after the greeting line) must not open with a follow-up cliche.
  const body = msg.split('\n').map((l) => l.trim()).filter(Boolean).slice(1).join(' ');
  if (/^(just\s+)?following up\b/i.test(body)) issues.push('opens with "following up"');
  BANNED_PHRASES.forEach((p) => { if (lower.includes(p)) issues.push(`uses banned phrase "${p}"`); });
  if (!isFinal && /\b(quick call|a call|phone call|intro call|discovery call|meeting|calendar|book a|schedule a|hop on|demo)\b/i.test(msg)) {
    issues.push('asks for a meeting or call (not allowed before final message)');
  }
  if (step.stage < totalStages - 1 && /\b(my team can help|we can help|we offer|our services|we provide)\b/i.test(msg)) {
    issues.push('pitches services before the bottleneck-and-proof message');
  }
  if (/\d+\s?%|\b\d+\s?x\b|\$\s?\d|₹\s?\d/i.test(msg)) issues.push('contains numbers or claimed results');
  if (step.stage === 1 && (msg.match(/\?/g) || []).length > 1) issues.push('asks more than one question');
  const questions = msg.match(/[^.?\n]*\?/g) || [];
  if (questions.some((q) => /,?\s\bor\b\s/i.test(q))) issues.push('asks an either/or question between guessed options');

  const nameOnly = NAME_ONLY_CLIENTS.find((c) => lower.includes(c.toLowerCase()) || (step.proof_used || '').toLowerCase().includes(c.toLowerCase()));
  if (nameOnly) {
    issues.push(`uses ${nameOnly} as proof, but the portfolio lists it by name only, so any description of that work would be invented; use a described project or keep the proof line general`);
  }

  const proof = (step.proof_used || '').trim();
  if (proof && !/^none$/i.test(proof) && !PORTFOLIO_ITEMS.some((p) => proof.toLowerCase().includes(p.toLowerCase()))) {
    issues.push(`proof "${proof}" is not in the portfolio`);
  }
  return issues;
}

// ---------- Gemini ----------

class QuotaError extends Error {}

const describeFailure = (err: unknown) => {
  if (err instanceof QuotaError) return 'the Gemini API quota is exhausted on every configured model (free tier allows about 20 requests per day per model; upgrade the plan or add models to GEMINI_FALLBACK_MODELS)';
  const msg = err instanceof Error ? err.message : String(err);
  if (/GEMINI_API_KEY/.test(msg)) return 'GEMINI_API_KEY is not set';
  if (/abort/i.test(msg)) return 'the Gemini request timed out';
  return 'the Gemini request failed';
};

// Free-tier quota is per model, so when one model is exhausted we move to the next.
const DEFAULT_FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

// Models that recently returned 429 (quota) or 404 (unavailable) are skipped until this time.
const modelCooldownUntil = new Map<string, number>();

function getModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
  const extra = (process.env.GEMINI_FALLBACK_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
  const chain = [...new Set([primary, ...(extra.length ? extra : DEFAULT_FALLBACK_MODELS)])];
  const now = Date.now();
  const available = chain.filter((m) => (modelCooldownUntil.get(m) || 0) <= now);
  // If everything is cooling down, still try the whole chain (quota may have reset).
  return available.length ? available : chain;
}

async function callGeminiModel(apiKey: string, modelName: string, body: string): Promise<unknown> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  // Short per-model timeout: a hung model should hand over to the next one quickly.
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal });
    if (response.status === 429) {
      modelCooldownUntil.set(modelName, Date.now() + 60 * 60 * 1000);
      throw new QuotaError(`Gemini API quota exceeded for model ${modelName}`);
    }
    if (response.status === 404) modelCooldownUntil.set(modelName, Date.now() + 24 * 60 * 60 * 1000);
    if (!response.ok) throw new Error(`Gemini API HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Malformed Gemini response: missing candidate text.');
    return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(prompt: string, responseSchema: object): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: 'application/json', responseSchema },
  });

  const errors: Error[] = [];
  for (const modelName of getModelChain()) {
    try {
      const result = await callGeminiModel(apiKey, modelName, body);
      logger.info(`Gemini sequence call succeeded with model ${modelName}.`);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);
      logger.warn(`Gemini model ${modelName} failed, trying next model: ${err.message}`);
    }
  }
  // Surface quota as the cause only when every model was exhausted.
  const nonQuota = errors.find((e) => !(e instanceof QuotaError));
  throw nonQuota || errors[0] || new Error('Gemini call failed');
}

const STEP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    message: { type: 'STRING' },
    stage: { type: 'INTEGER' },
    confidence: { type: 'STRING', enum: ['high', 'low'] },
    proof_used: { type: 'STRING' },
    missing_info: { type: 'STRING' },
  },
  required: ['message', 'stage', 'confidence', 'proof_used', 'missing_info'],
};

const SEQUENCE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    language: { type: 'STRING', description: 'Language the sequence is written in' },
    subject: { type: 'STRING', description: 'Subject line / InMail title for message 1' },
    messages: { type: 'ARRAY', items: STEP_SCHEMA, description: 'Exactly 4 messages, stages 1 to 4 in order' },
  },
  required: ['language', 'subject', 'messages'],
};

const formatThread = (steps: RawStep[]) =>
  steps.length ? steps.map((s) => `Message ${s.stage}:\n${s.message}`).join('\n\n') : '(empty)';

async function repairStep(
  base: string,
  prospect: string,
  stage: number,
  totalStages: number,
  thread: RawStep[],
  language: string,
  failed: RawStep,
  issues: string[]
): Promise<RawStep | null> {
  const prompt = `${base}

${prospect}

stage: ${stage}
total_stages: ${totalStages}
language: ${language}
thread_history:
${formatThread(thread)}

A previous draft of this stage broke these rules: ${issues.join('; ')}.
Previous draft (do not reuse its problems):
${failed.message}

Write stage ${stage} again following every rule.`;
  try {
    return stepSchema.parse(await callGemini(prompt, STEP_SCHEMA));
  } catch (err) {
    logger.warn(`Stage ${stage} repair failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

const FACT_CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    checks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { stage: { type: 'INTEGER' }, unsupported_claims: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['stage', 'unsupported_claims'],
      },
    },
  },
  required: ['checks'],
};

const factCheckSchema = z.object({
  checks: z.array(z.object({ stage: z.coerce.number(), unsupported_claims: z.array(z.string()).default([]) })),
});

/**
 * Independent fact check: lists statements about the prospect that the data does not support
 * (invented tenure, projects, problems stated as fact). Returns an empty map if the check cannot run.
 */
async function factCheckSequence(prospect: string, steps: RawStep[]): Promise<Map<number, string[]>> {
  const fullPrompt = buildSystemPrompt('');
  const portfolio = fullPrompt.split(/## PORTFOLIO/i)[1]?.split(/## OUTPUT/i)[0]?.trim() || '';
  const prompt = `You are a strict fact checker for cold outreach. Check each message against two sources.

1. PROSPECT FACTS: list every statement about the prospect, their company or their situation that is NOT directly supported by the facts. Examples: how long they have been in a role, what they personally work on, projects, achievements, problems or plans stated as fact, anything "noticed" that is not in the facts.
2. PORTFOLIO: list every statement about the sender's own work that goes beyond what the portfolio text says. Examples: features, workflows, results, outcomes or lessons attributed to a project that the portfolio does not mention, or any description of a client that is listed only by name.

Allowed and NOT to be listed: clearly framed hypotheses or questions ("one thing that can become a bottleneck..."), general observations about the industry, naming a portfolio project together with its own portfolio description, the greeting and the well wish.
Quote each problem phrase briefly. Use an empty list when a message is fine.

PROSPECT FACTS:
${prospect}

PORTFOLIO:
${portfolio}

MESSAGES:
${formatThread(steps)}`;
  try {
    const parsed = factCheckSchema.parse(await callGemini(prompt, FACT_CHECK_SCHEMA));
    return new Map(parsed.checks.filter((c) => c.unsupported_claims.length).map((c) => [c.stage, c.unsupported_claims.slice(0, 3)]));
  } catch (err) {
    logger.warn(`Outreach fact check skipped: ${err instanceof Error ? err.message : String(err)}`);
    return new Map();
  }
}

// English greeting in one consistent form: "Neha" / "Hi Neha" / "Neha," -> "Hi Neha,".
function normalizeGreeting(message: string, firstName: string, language: string): string {
  if (!/^english/i.test(language)) return message;
  const [first, ...rest] = message.split('\n');
  const name = firstName || 'there';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`^(hi|hello|hey)?\\s*${escaped}\\s*[,.]?$`, 'i').test(first.trim())) {
    return [`Hi ${name},`, ...rest].join('\n');
  }
  // Greeting missing entirely (e.g. "No worries either way" as line one): add it.
  if (!/^(hi|hello|hey|dear)\b/i.test(first.trim())) {
    const body = /[.?]$/.test(first.trim()) ? message : [`${first.trim()}.`, ...rest].join('\n');
    return `Hi ${name},\n\n${body}`;
  }
  return message;
}

// Keep the prospect's company name in its real casing inside the subject ("linkedin" -> "LinkedIn").
function fixSubjectCasing(subject: string, companyName: string) {
  if (!companyName) return subject;
  const escaped = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return subject.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), companyName);
}

function composeSteps(
  raw: RawStep[],
  subject: string,
  channel: OutreachChannel,
  sender: Sender,
  warnings: string[][]
): SequenceStepDraft[] {
  const baseSubject = subject.replace(/^re:\s*/i, '');
  // Language-neutral sign off (fits French, Italian etc.) with the sender's role for credibility.
  const signOff = channel === 'EMAIL' ? `\n\n${sender.name}\n${sender.role ? `${sender.role}, ` : ''}Tiny Script Soft Tech` : '';
  return raw.map((s, i) => ({
    stage: STAGE_IDS[i],
    stageNumber: (i + 1) as 1 | 2 | 3 | 4,
    subjectLine: i === 0 ? baseSubject : `Re: ${baseSubject}`,
    bodyContent: s.message + signOff,
    confidence: s.confidence,
    proofUsed: s.proof_used && s.proof_used.trim() ? s.proof_used.trim() : 'none',
    missingInfo: s.missing_info || '',
    qualityWarnings: warnings[i] || [],
  }));
}

/**
 * Generates all 4 stages in one call (fast), then enforces the rules per stage and
 * regenerates only the stages that break them, passing the real earlier thread.
 */
export async function generateAiSequence(
  profile: Company360Profile,
  channel: OutreachChannel,
  tone: ToneSetting,
  researchNotes?: string
): Promise<{ steps: SequenceStepDraft[]; language: string; source: 'AI' | 'FALLBACK' }> {
  const sender = await getSender();
  const { text: prospect, firstName, isThin } = buildProspectContext(profile, researchNotes);
  const protectedWords = [profile.overview.companyName, firstName].filter(Boolean);
  const base = `${buildSystemPrompt(`${sender.name}, ${sender.role}`)}

${GROUNDING_RULES}

${channelInstructions(channel, firstName)}
TONE NUDGE (never overrides the rules above): ${TONE_HINTS[tone]}`;

  try {
    const prompt = `${base}

EXECUTION NOTE: In this call write the whole sequence at once. Write Message 1 first, then treat each earlier message as thread_history for the next one. Return one JSON object with "language", "subject" (for message 1 / InMail title) and "messages": an array of exactly 4 objects, each with the OUTPUT FORMAT fields above, stages 1, 2, 3, 4 in order.

${prospect}

stage: 1 to 4 (full sequence)
total_stages: 4
thread_history: (empty)
language: the prospect's language based on their location and bio; English when unclear`;

    const parsed = sequenceSchema.parse(await callGemini(prompt, SEQUENCE_SCHEMA));
    const language = parsed.language || 'English';
    const ordered = [1, 2, 3, 4].map((n) => parsed.messages.find((m) => m.stage === n) || parsed.messages[n - 1]);

    const tidy = (text: string) => normalizeGreeting(sanitizeMessage(text, protectedWords), firstName, language);
    const drafts: RawStep[] = ordered.map((m, i) => ({ ...m, stage: i + 1, message: tidy(m.message) }));
    // One extra call checks every stage for claims the data does not support.
    const unsupported = await factCheckSequence(prospect, drafts);

    const finalSteps: RawStep[] = [];
    const warnings: string[][] = [];
    for (let i = 0; i < 4; i++) {
      let step = drafts[i];
      const claimIssues = (unsupported.get(i + 1) || []).map((c) => `unsupported claim: "${c}"`);
      let issues = [...findRuleViolations(step, channel, 4), ...claimIssues];
      if (issues.length) {
        logger.info(`Stage ${i + 1} broke rules (${issues.join('; ')}). Regenerating with thread context.`);
        const repaired = await repairStep(base, prospect, i + 1, 4, finalSteps, language, step, issues);
        if (repaired) {
          const candidate: RawStep = { ...repaired, stage: i + 1, message: tidy(repaired.message) };
          // The rewrite was told about the unsupported claims; only its code-checkable rules are re-verified.
          const candidateIssues = findRuleViolations(candidate, channel, 4);
          if (candidateIssues.length <= issues.length) {
            step = candidate;
            issues = candidateIssues;
          }
        }
      }
      // With no notes, description or signals, nothing can be "high confidence", whatever the model says.
      if (isThin) {
        step = {
          ...step,
          confidence: 'low',
          missing_info: step.missing_info || 'Their LinkedIn About section, a recent post, or company news. Add it under Prospect research and regenerate.',
        };
      }
      finalSteps.push(step);
    }

    const subject = fixSubjectCasing(sanitizeMessage(parsed.subject, protectedWords).replace(/\.$/, ''), profile.overview.companyName);
    logger.info(`AI sequence generated for '${profile.overview.companyName}' (${channel}, ${language}).`);
    return { steps: composeSteps(finalSteps, subject, channel, sender, warnings), language, source: 'AI' };
  } catch (err) {
    logger.warn(`AI sequence generation failed for '${profile.overview.companyName}', using rule-safe fallback: ${err instanceof Error ? err.message : String(err)}`);
    return { steps: buildFallbackSequence(profile, channel, sender, firstName, describeFailure(err)), language: 'English', source: 'FALLBACK' };
  }
}

/**
 * Deterministic sequence used when Gemini is unavailable. Follows the same rules,
 * but is marked low confidence because it cannot be truly specific to the prospect.
 */
function buildFallbackSequence(profile: Company360Profile, channel: OutreachChannel, sender: Sender, firstName: string, reason: string): SequenceStepDraft[] {
  const company = profile.overview.companyName;
  const industry = (profile.overview.industry || 'your').toLowerCase();
  const hi = firstName ? `Hi ${firstName},` : 'Hi there,';
  const firstSentence = (profile.overview.companyDescription || '').split(/(?<=[.?])\s/)[0]?.replace(/[.?]$/, '').trim();
  // Lowercase the first letter only when the sentence doesn't open with the company name ("Maison Lumen is...").
  const opensWithName = firstSentence && firstSentence.split(' ')[0] === company.split(' ')[0];
  const aboutText = firstSentence && !opensWithName ? firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1) : firstSentence;
  // Skip filler descriptions ("Leading company in the Technology space") and fragments without a verb.
  const isFiller = !firstSentence || /\bleading (company|provider|platform)\b|\bin the \w+ space\b/i.test(firstSentence)
    || !/\b(is|are|builds?|helps?|makes?|sells?|provides?|offers?|runs?|develops?)\b/i.test(firstSentence);
  const about = !isFiller && countWords(firstSentence) <= 25 ? `From what I understood, ${aboutText}. ` : '';

  const messages = [
    channel === 'LINKEDIN'
      // Must fit a LinkedIn connection note (300 characters).
      ? `${hi}\n\nI came across ${company} while looking at ${industry} teams and thought it made sense to connect. Curious how that side of the business is going for you right now.`
      : `${hi}\n\nI came across ${company} while looking at ${industry} teams. ${about}What I am trying to understand is how that side of the business is going for you right now.`,
    `${hi}\n\nOne thing I keep seeing with ${industry} companies at a similar stage is the roadmap and the day to day work competing for the same people. Curious how you are balancing that at ${company}, depending on how you are planning the next few months.`,
    `${hi}\n\nOne thing that can become a bottleneck at this stage is shipping new work without pulling the core team away from what already runs. My team works alongside in house teams on that kind of work, so if that's the case at some point, then we can look at it together.`,
    `${hi}\n\nI'll leave it here for now. Thanks for reading my notes, and all the best with ${company}.`,
  ];
  const raw: RawStep[] = messages.map((message, i) => ({
    stage: i + 1,
    message: sanitizeMessage(message, [company, firstName]),
    confidence: 'low',
    proof_used: 'none',
    missing_info: '',
  }));

  const missing = `AI generation was unavailable because ${reason}. This is a generic template: regenerate once AI is available, or personalise it with the prospect's bio, recent posts or launches before sending.`;
  return composeSteps(raw, `a question about ${company}`, channel, sender, raw.map(() => [])).map((s) => ({ ...s, missingInfo: missing }));
}
