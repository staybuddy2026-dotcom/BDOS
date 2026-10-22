import { logger } from '@/lib/logger';
import { geminiGenerate } from '@/lib/gemini';

/**
 * Buying-intent scoring for LinkedIn posts: how likely is the author to need a software
 * development partner right now? Scored by the AI model in one batch call, with a keyword
 * rule fallback when no AI key is set or the call fails.
 */

export type IntentLevel = 'HOT' | 'WARM' | 'COLD';

export type PostIntent = {
  level: IntentLevel;
  /** 0-100. HOT is 70+, WARM 40-69, COLD below 40. */
  score: number;
  reason: string;
};

export type IntentSource = 'AI' | 'RULES';

export type ScorablePost = { id: string; content: string; authorName?: string; authorHeadline?: string | null };

export const intentLevelFromScore = (score: number): IntentLevel => (score >= 70 ? 'HOT' : score >= 40 ? 'WARM' : 'COLD');

// --- Rule fallback ---------------------------------------------------------

const HOT_PATTERNS: [RegExp, string][] = [
  [/\b(looking for|need(?:s|ed)?|seeking|searching for|want(?:s)? to hire|in search of)\b[^.!?\n]{0,60}\b(developer|dev team|development (?:team|partner|agency|company)|software (?:agency|company|partner|house)|agency|freelancer|tech(?:nical)? partner|cto|co-?founder|engineers?|programmers?)\b/i, 'Asks for a developer or development partner'],
  [/\b(recommend|recommendations?|suggest|anyone know|can anyone|who can)\b[^.!?\n]{0,80}\b(agency|developers?|dev (?:shop|team)|software (?:company|agency)|freelancers?|app builder)\b/i, 'Asks for agency or developer recommendations'],
  [/\b(outsourc(?:e|ing)|offshore|nearshore|staff augmentation|dedicated (?:team|developers?))\b[^.!?\n]{0,60}\b(looking|need|partner|vendor|team|options?)\b/i, 'Exploring outsourcing'],
  [/\b(rfp|request for proposal|accepting proposals|send (?:me )?(?:your )?(?:proposal|quote|portfolio)|dm me (?:your )?(?:portfolio|rates))\b/i, 'Inviting proposals or quotes'],
  [/\b(build|develop|rebuild|redesign|revamp)\b[^.!?\n]{0,40}\b(app|mvp|website|platform|saas|product|portal|marketplace)\b[^.!?\n]{0,60}\b(looking|need|help|who|partner|budget|quote)\b/i, 'Has a build project and is asking for help'],
];

const WARM_PATTERNS: [RegExp, string][] = [
  [/\b(we(?:'| a)?re hiring|now hiring|hiring (?:a |an |for )?|join our team|open (?:roles?|positions?))\b[^.!?\n]{0,80}\b(engineers?|developers?|react|node|python|flutter|mobile|backend|frontend|full[- ]?stack|devops|ai|ml)\b/i, 'Hiring engineers'],
  [/\b(raised|closed|secured|announc\w+)\b[^.!?\n]{0,50}\b(seed|pre-seed|series [a-d]|funding|round|\$\s?\d)/i, 'Recently funded'],
  [/\b(launch(?:ed|ing)|shipp(?:ed|ing)|releas(?:ed|ing)|beta|waitlist)\b[^.!?\n]{0,60}\b(app|product|platform|mvp|version|feature)\b/i, 'Launching a product'],
  [/\b(scal(?:e|ing)|migrat(?:e|ing|ion)|moderni[sz](?:e|ing|ation)|tech(?:nical)? debt|legacy (?:system|code)|re-?platform)\b/i, 'Scaling or modernising their tech'],
  [/\b(struggling|bottleneck|can't find|hard to find|shortage)\b[^.!?\n]{0,60}\b(developers?|engineers?|talent|tech)\b/i, 'Short on engineering capacity'],
];

const JOB_SEEKER = /\b(open to work|#opentowork|looking for (?:a |my )?(?:new )?(?:job|role|opportunit(?:y|ies)|position)|available for (?:hire|freelance|work)|actively seeking)\b/i;
const SELLING = new RegExp([
  /\b(?:we (?:offer|provide|build|deliver|help|speciali[sz]e)|our (?:services|agency|team (?:builds|can)|(?:technology |tech |development )?(?:capabilities|expertise|solutions))|hire (?:us|our))\b/.source,
  // Not "contact us" / "DM us": buyers write those too ("Agencies, DM us").
  /\b(?:book a (?:free )?(?:call|consultation|demo)|get a free (?:quote|audit|consultation)|contact us (?:today|now)|let'?s connect us)\b/.source,
  // Pitches aimed at the reader: "Looking for a technical partner for your agency?"
  /\b(?:looking for|need)\b[^.!?\n]{0,60}\bfor your (?:agency|business|startup|company|team|brand|clients?)\b/.source,
  /\b(?:(?:technology|tech|development|white[- ]label) partner for (?:agencies|businesses|startups)|expand your (?:delivery|team|capabilities)|without (?:building|hiring) (?:every|an? )?(?:in-house|technical|dev))/.source,
  /\b(?:happy to be working with|proud to (?:support|partner with)|supporting their team with)\b/.source,
].join('|'), 'i');

/** Keyword-rule scoring. A job seeker is never a buyer; an explicit request for help outranks everything else. */
export function scorePostByRules(post: ScorablePost): PostIntent {
  const text = `${post.content || ''}`.slice(0, 4000);
  if (JOB_SEEKER.test(text)) return { level: 'COLD', score: 10, reason: 'Job seeker, not a buyer' };

  // A vendor's ad often reads like a request ("Looking for a tech partner? Let's connect"), so selling wins.
  if (SELLING.test(text)) return { level: 'COLD', score: 15, reason: 'Promoting their own services, not looking to buy' };
  const hot = HOT_PATTERNS.find(([re]) => re.test(text));
  if (hot) return { level: 'HOT', score: 85, reason: hot[1] };

  const warm = WARM_PATTERNS.filter(([re]) => re.test(text));
  if (warm.length) {
    const score = Math.min(65, 45 + (warm.length - 1) * 10);
    return { level: 'WARM', score, reason: warm.map(([, label]) => label).join(' · ') };
  }
  return { level: 'COLD', score: 25, reason: 'No buying signal found in the post' };
}

// --- AI scoring ------------------------------------------------------------

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

/** One JSON answer from Gemini, through the shared helper (tries the next model when one is busy). */
async function callGemini(prompt: string): Promise<string> {
  const result = await geminiGenerate(
    { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } },
    { label: 'LinkedIn intent', timeoutMs: 25000 },
  );
  return result.text;
}

export const hasAiKey = () => !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY) && process.env.AI_MOCK_MODE !== 'true';

/**
 * Scores up to 30 posts in one model call. Posts the model skips (or a failed call) fall back to the rules,
 * so every post always gets a score; `source` tells the UI which method produced them.
 */
export async function scorePosts(posts: ScorablePost[]): Promise<{ scores: Record<string, PostIntent>; source: IntentSource }> {
  const batch = posts.slice(0, 30);
  const rules = Object.fromEntries(batch.map((p) => [p.id, scorePostByRules(p)])) as Record<string, PostIntent>;
  if (!batch.length || !hasAiKey()) return { scores: rules, source: 'RULES' };

  const prompt = `You qualify LinkedIn posts for a software development agency (web, mobile, AI, cloud, dedicated developer teams).
For each post decide how likely the AUTHOR is to buy software development services soon.

HOT (70-100): the author asks for developers, an agency, a technical partner or a quote, or describes a project they need built now.
WARM (40-69): no direct request, but a real trigger: hiring engineers, new funding, a launch, scaling or migration pain.
COLD (0-39): job seekers, agencies or freelancers advertising their own services, recruiters, generic advice, news or motivation.

Judge only what the post and the author's headline say. Do not assume facts that are not there.
"reason" must be one short sentence (max 14 words) quoting or naming the signal.

POSTS:
${JSON.stringify(batch.map((p, i) => ({ n: i + 1, author: clip(`${p.authorName || ''}${p.authorHeadline ? `, ${p.authorHeadline}` : ''}`, 160), post: clip((p.content || '').replace(/\s+/g, ' '), 900) })))}

Output ONLY a JSON array with one object per post: [{"n": 1, "score": 0-100, "reason": "..."}]`;

  try {
    const parsed = JSON.parse(await callGemini(prompt)) as unknown;
    if (!Array.isArray(parsed)) throw new Error('Unexpected AI response shape');
    const scores = { ...rules };
    for (const row of parsed as { n?: unknown; score?: unknown; reason?: unknown }[]) {
      const post = batch[Number(row?.n) - 1];
      const score = Math.round(Number(row?.score));
      if (!post || !Number.isFinite(score)) continue;
      const bounded = Math.max(0, Math.min(100, score));
      scores[post.id] = { level: intentLevelFromScore(bounded), score: bounded, reason: clip(String(row.reason || '').trim(), 160) || rules[post.id].reason };
    }
    return { scores, source: 'AI' };
  } catch (err) {
    logger.warn('AI intent scoring failed; using keyword rules', { error: String(err) });
    return { scores: rules, source: 'RULES' };
  }
}

/** A short, genuine comment for engaging with a post before reaching out. Needs the AI key. */
export async function draftComment(post: { content: string; authorName?: string; authorHeadline?: string | null }, commenter: string): Promise<string> {
  const prompt = `Write a LinkedIn comment that ${commenter}, who works at a software development agency, could post under this post.

Rules:
- 2 sentences, at most 45 words, in the same language as the post.
- React to one specific point in the post and add a useful thought or a genuine question.
- No sales pitch, no offer of services, no "DM me", no links, no hashtags, no emojis.
- Sound like a person, not a marketer. Do not start with "Great post".

AUTHOR: ${clip(`${post.authorName || ''}${post.authorHeadline ? `, ${post.authorHeadline}` : ''}`, 160)}
POST: ${clip((post.content || '').replace(/\s+/g, ' '), 1500)}

Output ONLY JSON: {"comment": "..."}`;
  const parsed = JSON.parse(await callGemini(prompt)) as { comment?: unknown };
  const comment = String(parsed.comment || '').trim();
  if (!comment) throw new Error('Empty comment');
  return comment;
}

/** LinkedIn caps connection-request notes at 300 characters (200 on some free accounts). */
const NOTE_LIMIT = 280;

/**
 * The short note sent with a LinkedIn connection request alongside an email sequence. Uses the AI
 * model when a key is set; otherwise a plain, honest note built from the email's own subject.
 */
export async function draftConnectionNote(params: {
  contactName?: string;
  contactTitle?: string;
  companyName: string;
  emailSubject?: string;
  emailBody?: string;
  senderName: string;
}): Promise<{ note: string; source: IntentSource }> {
  const firstName = (params.contactName || '').trim().split(/\s+/)[0] || '';
  const fallback = clip(
    `Hi${firstName ? ` ${firstName}` : ''}, I came across ${params.companyName}${params.emailSubject ? ` while looking into ${params.emailSubject.replace(/^(re|fwd?):\s*/i, '').toLowerCase()}` : ''} and would like to connect. ${params.senderName.split(/\s+/)[0]}`,
    NOTE_LIMIT
  );
  if (!hasAiKey()) return { note: fallback, source: 'RULES' };

  const prompt = `Write the note for a LinkedIn connection request from ${params.senderName} (software development agency) to ${params.contactName || 'a decision maker'}${params.contactTitle ? `, ${params.contactTitle}` : ''} at ${params.companyName}.
An email was sent to them as well; the note must not repeat the email or pitch services.

Rules:
- At most ${NOTE_LIMIT - 30} characters in total, greeting included. One or two short sentences.
- Mention one specific, true reason to connect, taken from the email below. Do not invent facts.
- No links, no hashtags, no emojis, no "I'd love to pick your brain".
- Sign off with the sender's first name.

EMAIL SUBJECT: ${clip(params.emailSubject || '', 160)}
EMAIL: ${clip((params.emailBody || '').replace(/\s+/g, ' '), 900)}

Output ONLY JSON: {"note": "..."}`;
  try {
    const parsed = JSON.parse(await callGemini(prompt)) as { note?: unknown };
    const note = String(parsed.note || '').trim();
    if (!note) throw new Error('Empty note');
    return { note: clip(note, NOTE_LIMIT), source: 'AI' };
  } catch (err) {
    logger.warn('AI connection note failed; using a plain note', { error: String(err) });
    return { note: fallback, source: 'RULES' };
  }
}

/**
 * A follow-up for a contacted lead who just posted something relevant on LinkedIn. Refers to the
 * new post and the earlier outreach, never claims anything the post does not say.
 */
export async function draftReEngagementMessage(params: {
  prospectName: string;
  postContent: string;
  previousMessage: string;
  senderName?: string;
}): Promise<string> {
  const firstName = params.prospectName.trim().split(/\s+/)[0] || 'there';
  const fallback = `Hi ${firstName},\n\nI saw your recent post on LinkedIn and it reminded me of my earlier note. If it is still on your radar, happy to share how we approached something similar.\n\nOpen to a quick chat?`;
  if (!hasAiKey()) return fallback;

  const prompt = `Write a short re-engagement message to ${params.prospectName}. We contacted them before without a reply, and they just posted on LinkedIn.

Rules:
- 3 to 4 sentences, at most 80 words, in the language of their post.
- Open by referring to one specific point from their new post (quote at most 8 words).
- Link it to the earlier message in one sentence; do not repeat it.
- End with a low-pressure question. No links, no emojis, no invented facts.
${params.senderName ? `- Sign off as ${params.senderName.split(/\s+/)[0]}.` : ''}

THEIR NEW POST: ${clip(params.postContent.replace(/\s+/g, ' '), 1200)}
OUR EARLIER MESSAGE: ${clip(params.previousMessage.replace(/\s+/g, ' '), 700)}

Output ONLY JSON: {"message": "..."}`;
  try {
    const parsed = JSON.parse(await callGemini(prompt)) as { message?: unknown };
    const message = String(parsed.message || '').trim();
    return message || fallback;
  } catch (err) {
    logger.warn('AI re-engagement draft failed; using a plain message', { error: String(err) });
    return fallback;
  }
}
