/**
 * The bridge between LinkedIn Sales Navigator and the CRM.
 *
 * LinkedIn only lets approved enterprise partners (Salesforce, HubSpot, Dynamics) read or write
 * Sales Navigator data, so there is no automatic sync. Instead:
 *  - Sales Navigator -> CRM: a browser bookmark ("Send to CRM") reads the lead(s) on the Sales
 *    Navigator page the BDE is looking at and opens the CRM's import page with them; a pasted
 *    list works the same way.
 *  - CRM -> Sales Navigator: every contact links back to their Sales Navigator lead page (or a
 *    search for them), and InMails / messages sent there are logged on the deal.
 *
 * Nothing here uses the BDE's LinkedIn session or automates LinkedIn, so no account is at risk.
 * Shared by the browser and the server: no server-only imports.
 */

export type SalesNavLead = {
  name: string;
  title?: string;
  company?: string;
  /** Public profile (linkedin.com/in/...) or Sales Navigator lead page (linkedin.com/sales/lead/...). */
  url?: string;
};

export const MAX_SALESNAV_IMPORT = 50;

const PUBLIC_PROFILE = /^https:\/\/([a-z]+\.)?linkedin\.com\/in\/[^/?#\s]+/i;
const SALES_LEAD = /^https:\/\/([a-z]+\.)?linkedin\.com\/sales\/(lead|people)\/[^?#\s]+/i;

/** Drops tracking parameters and the trailing slash, keeping the part that identifies the person. */
export function cleanUrl(url?: string): string | undefined {
  const u = url?.trim().split(/[?#]/)[0].replace(/\/+$/, '');
  return u && /^https:\/\//i.test(u) ? u : undefined;
}

export const isPublicProfileUrl = (url?: string) => !!url && PUBLIC_PROFILE.test(url);
export const isSalesNavLeadUrl = (url?: string) => !!url && SALES_LEAD.test(url);

/** Sales Navigator people search for a person (used when we don't know their lead page). */
export function salesNavPeopleSearchUrl(name: string, company?: string): string {
  const keywords = [name, company].map((v) => (v || '').replace(/\(independent\)/i, '').trim()).filter(Boolean).join(' ');
  return `https://www.linkedin.com/sales/search/people?keywords=${encodeURIComponent(keywords)}`;
}

export function salesNavCompanySearchUrl(company: string): string {
  return `https://www.linkedin.com/sales/search/company?keywords=${encodeURIComponent(company.trim())}`;
}

/**
 * Reads a pasted list, one lead per line. Each line can be just a LinkedIn / Sales Navigator URL,
 * or "Name, Title, Company, URL" separated by commas or tabs (rows copied from a spreadsheet).
 */
export function parseSalesNavInput(text: string): SalesNavLead[] {
  const leads: SalesNavLead[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Sales Navigator lead links contain commas ("…/sales/lead/ACwAA…,NAME_SEARCH,xyz"), so they are
    // matched up to the next space or tab; other LinkedIn links end at a comma.
    const urlMatch =
      line.match(/https:\/\/[^\s,\t]*linkedin\.com\/sales\/(?:lead|people)\/[^\s\t]+/i) ||
      line.match(/https:\/\/[^\s,\t]*linkedin\.com\/[^\s,\t]+/i);
    const url = cleanUrl(urlMatch?.[0]);
    const rest = (urlMatch ? line.replace(urlMatch[0], '') : line)
      .split(line.includes('\t') ? '\t' : ',')
      .map((p) => p.trim())
      .filter(Boolean);
    const [name = '', title, company] = rest;
    // A bare public profile URL still names the person: linkedin.com/in/riya-shah-123 -> "Riya Shah".
    const fromUrl = !name && url && isPublicProfileUrl(url) ? nameFromProfileUrl(url) : '';
    if (!name && !fromUrl && !url) continue;
    leads.push({ name: name || fromUrl, title, company, url });
    if (leads.length >= MAX_SALESNAV_IMPORT) break;
  }
  return leads;
}

/** "https://www.linkedin.com/in/riya-shah-4a1b2c" -> "Riya Shah" (a guess, shown for editing). */
export function nameFromProfileUrl(url: string): string {
  const slug = url.split('/in/')[1]?.split('/')[0] || '';
  return decodeURIComponent(slug)
    .split('-')
    .filter((part) => /^[a-z]+$/i.test(part) && part.length > 1)
    .slice(0, 3)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** The bookmark hands leads over in the URL as base64 JSON; only well-formed entries are kept. */
export function decodeBookmarkPayload(payload: string): SalesNavLead[] {
  try {
    const json = decodeURIComponent(escape(atob(payload)));
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) return [];
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : undefined);
    return data
      .map((d) => (d && typeof d === 'object' ? (d as Record<string, unknown>) : {}))
      .map((d) => ({ name: str(d.name, 120) || '', title: str(d.title, 200), company: str(d.company, 120), url: cleanUrl(str(d.url, 400)) }))
      .filter((l) => l.name || l.url)
      .slice(0, MAX_SALESNAV_IMPORT);
  } catch {
    return [];
  }
}

/**
 * The "Send to CRM" bookmark. On a Sales Navigator lead page (or a public profile) it sends that
 * person; on search results or a lead list it sends every lead shown (up to 25). It only reads the
 * page in the BDE's own browser and opens the CRM in a new tab; it never clicks or sends anything
 * on LinkedIn. Sales Navigator marks names, titles and companies with data-anonymize attributes.
 */
export function buildSalesNavBookmarklet(appOrigin: string): string {
  const code = `(()=>{const A=${JSON.stringify(appOrigin)};const t=e=>((e&&e.innerText)||'').replace(/\\s+/g,' ').trim();const q=(r,s)=>r&&r.querySelector(s);let L=[];const single=/\\/sales\\/lead\\/|\\/sales\\/people\\/|\\/in\\//.test(location.pathname);if(single){L=[{url:location.href,name:t(q(document,'[data-anonymize="person-name"]'))||t(q(document,'h1')),title:t(q(document,'[data-anonymize="headline"]'))||t(q(document,'[data-anonymize="job-title"]'))||t(q(document,'.text-body-medium')),company:t(q(document,'[data-anonymize="company-name"]'))}];}else{const seen=new Set();for(const a of document.querySelectorAll('a[href*="/sales/lead/"],a[href*="/sales/people/"]')){const u=a.href.split('?')[0];if(seen.has(u))continue;const row=a.closest('li,tr,article')||a.parentElement;const name=t(q(row,'[data-anonymize="person-name"]'))||t(a);if(!name||name.length>80)continue;seen.add(u);L.push({url:u,name,title:t(q(row,'[data-anonymize="title"]'))||t(q(row,'[data-anonymize="job-title"]')),company:t(q(row,'[data-anonymize="company-name"]'))});if(L.length>=25)break;}}if(!L.length||!L[0].name){alert('No Sales Navigator lead found on this page. Open a lead, a lead list or search results, then click the bookmark again.');return;}const p=btoa(unescape(encodeURIComponent(JSON.stringify(L))));window.open(A+'/linkedin/sales-navigator?leads='+encodeURIComponent(p),'_blank');})();`;
  return `javascript:${encodeURIComponent(code)}`;
}
