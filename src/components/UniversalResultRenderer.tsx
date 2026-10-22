'use client';

import { useState } from 'react';
import { 
  Building2, 
  Globe, 
  MapPin, 
  ArrowRight, 
  Zap, 
  Mail, 
  Phone,
  Link as LinkIcon,
  CheckCircle,
  Star,
  Loader2,
  Copy,
  Check,
  UserPlus,
  Kanban
} from 'lucide-react';
import { LeadItem } from '@/features/providers/types';
import type { ApolloPersonMatch, ApolloOrganizationMatch } from '@/features/apollo/provider';
import { STAGE_LABELS } from '@/features/crm/types';
import type { CrmMatch } from '@/features/crm/types';

interface UniversalResultRendererProps {
  item?: LeadItem;
  person?: ApolloPersonMatch;
  organization?: ApolloOrganizationMatch;
  searchMode: 'people' | 'companies';
  isViewed?: boolean;
  isSaved?: boolean;
  isSaving?: boolean;
  onSavePerson?: (person: ApolloPersonMatch) => void;
  onUnsavePerson?: (person: ApolloPersonMatch) => void;
  onEnrichPerson?: (person: ApolloPersonMatch) => void;
  onFindDecisionMakers?: (org: ApolloOrganizationMatch) => void;
  onResearchInCompany360?: (org: ApolloOrganizationMatch) => void;
  onLinkToPost?: (person: ApolloPersonMatch) => void;
  formatPersonName?: (name: string) => string;
  /** Set when this person or company already has a deal in the CRM. */
  crmMatch?: CrmMatch;
  /** Row checkbox for bulk actions (people only). */
  isSelected?: boolean;
  onToggleSelect?: (person: ApolloPersonMatch) => void;
  isAddingToCrm?: boolean;
  onAddToCrm?: (person: ApolloPersonMatch) => void;
  onAddCompanyToCrm?: (org: ApolloOrganizationMatch) => void;
  /** Looks up tech stack, funding and description for one company (1 Apollo credit; the page confirms first). */
  onEnrichCompany?: (org: ApolloOrganizationMatch) => void;
  isEnrichingCompany?: boolean;
}

/** 0.123 -> "+12%" */
const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;

/** "In CRM" marker: who owns the deal and how far it is, so nobody works the same lead twice. */
function CrmBadge({ match }: { match: CrmMatch }) {
  const label = `In CRM · ${STAGE_LABELS[match.stage]} · ${match.mine ? 'yours' : match.ownerName || 'unassigned'}`;
  const style: React.CSSProperties = {
    fontSize: '0.68rem', padding: '2px 7px', borderRadius: '999px', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px',
    marginTop: '4px', width: 'fit-content', textDecoration: 'none',
    background: match.mine ? '#eef2ff' : '#fffbeb', color: match.mine ? '#4338ca' : '#92400e', border: `1px solid ${match.mine ? '#c7d2fe' : '#fde68a'}`,
  };
  return match.dealId
    ? <a href={`/crm?deal=${match.dealId}`} style={style} title="Open this deal in the CRM"><Kanban size={10} /> {label}</a>
    : <span style={style} title="This deal belongs to a teammate"><Kanban size={10} /> {label}</span>;
}

export function UniversalResultRenderer({
  item,
  person,
  organization,
  searchMode,
  isViewed = false,
  isSaved = false,
  isSaving = false,
  onSavePerson,
  onUnsavePerson,
  onEnrichPerson,
  onFindDecisionMakers,
  onResearchInCompany360,
  onLinkToPost,
  formatPersonName = (n) => n || 'Lead Contact',
  crmMatch,
  isSelected = false,
  onToggleSelect,
  isAddingToCrm = false,
  onAddToCrm,
  onAddCompanyToCrm,
  onEnrichCompany,
  isEnrichingCompany = false,
}: UniversalResultRendererProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1500);
  };

  if (searchMode === 'people' && person) {
    const isEnriched = Boolean(person.workEmail || person.personalEmail || person.phone || isViewed);

    return (
      <tr 
        style={{ 
          borderBottom: '1px solid #e2e8f0', 
          transition: 'all 0.25s ease',
          background: isSaved ? '#f1f5f9' : (isEnriched ? '#f0fdf4' : '#ffffff'),
          borderLeft: isSaved ? '4px solid #94a3b8' : (isEnriched ? '4px solid #10b981' : '4px solid transparent')
        }}
        onMouseEnter={(e) => { if(!isSaved && !isEnriched) e.currentTarget.style.background = '#f8fafc'; }}
        onMouseLeave={(e) => { if(!isSaved && !isEnriched) e.currentTarget.style.background = '#ffffff'; }}
      >
        {/* SELECT Column */}
        {onToggleSelect && (
          <td style={{ paddingLeft: '16px', verticalAlign: 'top', paddingTop: '14px' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(person)}
              aria-label={`Select ${formatPersonName(person.personName)}`}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#4f46e5' }}
            />
          </td>
        )}

        {/* PERSON Column */}
        <td style={{ paddingLeft: onToggleSelect ? '4px' : '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.86rem', color: isSaved ? '#374151' : '#0f172a' }}>
                {formatPersonName(person.personName)}
              </span>
              {person.linkedinUrl && (
                <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', display: 'inline-flex' }}>
                  <Globe size={11} />
                </a>
              )}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
              {person.jobTitle || 'Title not listed'}
            </div>
            {person.location && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} /> {person.location}
              </div>
            )}
            {crmMatch && <CrmBadge match={crmMatch} />}
          </div>
        </td>

        {/* COMPANY Column */}
        <td>
          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
            {person.organizationName || 'Company Not Disclosed'}
          </div>
          {person.organizationDomain && (
            <a href={`https://${person.organizationDomain}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontWeight: 600 }}>
              <Globe size={11} /> {person.organizationDomain}
            </a>
          )}
          {person.organizationIndustry && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              Industry: <span style={{ color: '#334155', fontWeight: 600 }}>{person.organizationIndustry}</span>
            </div>
          )}
        </td>



        {/* GROWTH SIGNALS Column */}
        <td>
          {person.searchMatches && person.searchMatches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {person.searchMatches.map((sig, idx) => (
                <span key={idx} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                  ✓ {sig.label}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>None found</span>
          )}
        </td>

        {/* CONTACT AVAILABILITY Column */}
        <td>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
            {person.workEmail ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span 
                  onClick={(e) => handleCopyText(person.workEmail!, `email-${person.apolloPersonId || person.workEmail}`, e)}
                  style={{ 
                    fontSize: '0.73rem', 
                    color: '#047857', 
                    fontWeight: 700, 
                    background: '#ecfdf5', 
                    border: '1px solid #a7f3d0', 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px'
                  }}
                  title={`Click to copy email: ${person.workEmail}`}
                >
                  <Mail size={11} style={{ color: '#059669', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.workEmail}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyText(person.workEmail!, `email-${person.apolloPersonId || person.workEmail}`, e)}
                  style={{
                    background: copiedKey === `email-${person.apolloPersonId || person.workEmail}` ? '#dcfce7' : '#ffffff',
                    border: copiedKey === `email-${person.apolloPersonId || person.workEmail}` ? '1px solid #16a34a' : '1px solid #cbd5e1',
                    color: copiedKey === `email-${person.apolloPersonId || person.workEmail}` ? '#15803d' : '#475569',
                    borderRadius: '6px',
                    padding: '4px 7px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title="Copy email address"
                >
                  {copiedKey === `email-${person.apolloPersonId || person.workEmail}` ? (
                    <Check size={12} style={{ color: '#16a34a' }} />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            ) : (
              // Apollo's search says whether it holds an email; it is only shown after a reveal.
              <span
                style={{ fontSize: '0.72rem', color: person.hasEmailAvailable ? '#0369a1' : '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title={person.hasEmailAvailable ? 'Apollo has an email for this person. Reveal it with Enrich (1 credit).' : 'Apollo has no email on file for this person.'}
              >
                <Mail size={11} style={{ flexShrink: 0 }} /> {person.hasEmailAvailable ? 'Email on file (reveal to see)' : 'No email in Apollo'}
              </span>
            )}

            {person.phone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span 
                  onClick={(e) => handleCopyText(person.phone!, `phone-${person.apolloPersonId || person.phone}`, e)}
                  style={{ 
                    fontSize: '0.72rem', 
                    color: '#0284c7', 
                    fontWeight: 700, 
                    background: '#f0f9ff', 
                    border: '1px solid #bae6fd', 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }} 
                  title={`Click to copy phone: ${person.phone}`}
                >
                  <Phone size={10} style={{ flexShrink: 0 }} /> {person.phone}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyText(person.phone!, `phone-${person.apolloPersonId || person.phone}`, e)}
                  style={{
                    background: copiedKey === `phone-${person.apolloPersonId || person.phone}` ? '#dcfce7' : '#ffffff',
                    border: copiedKey === `phone-${person.apolloPersonId || person.phone}` ? '1px solid #16a34a' : '1px solid #cbd5e1',
                    color: copiedKey === `phone-${person.apolloPersonId || person.phone}` ? '#15803d' : '#475569',
                    borderRadius: '6px',
                    padding: '4px 7px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title="Copy phone number"
                >
                  {copiedKey === `phone-${person.apolloPersonId || person.phone}` ? (
                    <Check size={12} style={{ color: '#16a34a' }} />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            ) : null}

            {person.personalEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span 
                  onClick={(e) => handleCopyText(person.personalEmail!, `pemail-${person.apolloPersonId || person.personalEmail}`, e)}
                  style={{ fontSize: '0.7rem', color: '#4b5563', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }} 
                  title="Click to copy personal email"
                >
                  <Mail size={10} style={{ flexShrink: 0 }} /> {person.personalEmail}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyText(person.personalEmail!, `pemail-${person.apolloPersonId || person.personalEmail}`, e)}
                  style={{
                    background: copiedKey === `pemail-${person.apolloPersonId || person.personalEmail}` ? '#dcfce7' : '#ffffff',
                    border: copiedKey === `pemail-${person.apolloPersonId || person.personalEmail}` ? '1px solid #86efac' : '1px solid #cbd5e1',
                    color: copiedKey === `pemail-${person.apolloPersonId || person.personalEmail}` ? '#15803d' : '#64748b',
                    borderRadius: '5px',
                    padding: '3px 6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                  }}
                  title="Copy personal email"
                >
                  {copiedKey === `pemail-${person.apolloPersonId || person.personalEmail}` ? <Check size={11} style={{ color: '#16a34a' }} /> : <Copy size={11} />}
                </button>
              </div>
            )}

            {/* Copy Full Executive Profile Card */}
            {(person.workEmail || person.phone) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const fullText = `Name: ${formatPersonName(person.personName)}\nTitle: ${person.jobTitle || 'N/A'}\nCompany: ${person.organizationName || 'N/A'}\nWork Email: ${person.workEmail || 'N/A'}\nPhone: ${person.phone || 'N/A'}\nLinkedIn: ${person.linkedinUrl || 'N/A'}`;
                  handleCopyText(fullText, `full-${person.apolloPersonId || person.personName}`, e);
                }}
                style={{
                  marginTop: '1px',
                  background: copiedKey === `full-${person.apolloPersonId || person.personName}` ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0052ff, #00d09c)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0, 82, 255, 0.2)',
                  width: 'fit-content',
                  whiteSpace: 'nowrap'
                }}
                title="Copy complete contact profile card"
              >
                {copiedKey === `full-${person.apolloPersonId || person.personName}` ? (
                  <>
                    <Check size={10} />
                    <span>Copied Full Profile!</span>
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                    <span>Copy Full Contact Card</span>
                  </>
                )}
              </button>
            )}
          </div>
        </td>

        {/* ACTIONS Column */}
        <td style={{ padding: '8px 20px 8px 10px', verticalAlign: 'top', textAlign: 'right' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'flex-end' }}>
            {/* 1. Save / Saved Action */}
            {isSaved ? (
              <div style={{ display: 'flex', gap: '3px', width: '100%', alignItems: 'center' }}>
                <span 
                  style={{ 
                    flex: 1,
                    padding: '5px 4px', 
                    fontSize: '0.7rem', 
                    background: '#dcfce7', 
                    color: '#047857', 
                    border: '1px solid #a7f3d0', 
                    borderRadius: '6px', 
                    whiteSpace: 'nowrap', 
                    fontWeight: 800, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '3px' 
                  }}
                >
                  <CheckCircle size={11} style={{ color: '#059669', flexShrink: 0 }} /> Saved
                </span>
                {onUnsavePerson && (
                  <button
                    type="button"
                    onClick={() => onUnsavePerson(person)}
                    style={{
                      padding: '5px 6px',
                      fontSize: '0.66rem',
                      background: '#ffffff',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    title="Remove from Saved Data"
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#ffffff'; }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : isSaving ? (
              <button 
                type="button"
                disabled
                style={{ 
                  width: '100%',
                  padding: '5px 6px', 
                  fontSize: '0.71rem', 
                  background: '#f3f4f6', 
                  color: '#6b7280', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '6px', 
                  whiteSpace: 'nowrap', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '3px',
                  cursor: 'not-allowed'
                }}
              >
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
              </button>
            ) : (
              onSavePerson && (
                <button 
                  type="button"
                  onClick={() => onSavePerson(person)}
                  style={{ 
                    width: '100%',
                    padding: '5px 8px', 
                    fontSize: '0.72rem', 
                    background: '#ffffff', 
                    color: '#1e293b', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    whiteSpace: 'nowrap', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(99, 102, 241, 0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(15, 23, 42, 0.02)'; }}
                >
                  <Star size={12} style={{ color: '#f59e0b', fill: '#fef3c7', flexShrink: 0 }} /> Save
                </button>
              )
            )}

            {/* 2. Enrich Contact Primary Action */}
            {onEnrichPerson && (
              <button 
                type="button"
                onClick={() => onEnrichPerson(person)}
                style={{ 
                  width: '100%',
                  padding: '5.5px 6px', 
                  fontSize: '0.72rem', 
                  background: 'linear-gradient(135deg, #6366f1, #3b82f6)', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  whiteSpace: 'nowrap', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
              >
                <Zap size={12} style={{ color: '#ffffff', fill: '#ffffff', flexShrink: 0 }} /> Enrich Contact
              </button>
            )}

            {/* 3. Add to CRM */}
            {onAddToCrm && !crmMatch && (
              <button
                type="button"
                onClick={() => onAddToCrm(person)}
                disabled={isAddingToCrm}
                title="Create a deal in your CRM pipeline with this person as the contact"
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  fontWeight: 800,
                  cursor: isAddingToCrm ? 'not-allowed' : 'pointer',
                  opacity: isAddingToCrm ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {isAddingToCrm ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} /> : <UserPlus size={12} style={{ flexShrink: 0 }} />} Add to CRM
              </button>
            )}

            {/* 4. Link Action */}
            {onLinkToPost && (
              <button 
                type="button"
                onClick={() => onLinkToPost(person)}
                title="Sync & link contact profile directly to Company 360 & CRM Pipeline"
                style={{ 
                  width: '100%',
                  padding: '5px 8px', 
                  fontSize: '0.72rem', 
                  whiteSpace: 'nowrap', 
                  background: '#f8fafc', 
                  color: '#475569', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#7c3aed'; e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(139, 92, 246, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <LinkIcon size={12} style={{ flexShrink: 0 }} /> Link
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  if (searchMode === 'companies' && organization) {
    return (
      <tr style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
        {/* COMPANY Column */}
        <td style={{ paddingLeft: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(0, 208, 156, 0.12)', border: '1px solid rgba(0, 208, 156, 0.3)', padding: '8px', borderRadius: '8px', color: 'var(--accent-indigo)', flexShrink: 0 }}>
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                {organization.name}
              </div>
              {organization.domain && (
                <a href={`https://${organization.domain}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontWeight: 600 }}>
                  <Globe size={11} /> {organization.domain}
                </a>
              )}
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                Industry: <span style={{ color: '#334155', fontWeight: 600 }}>{organization.industry || 'Not listed'}</span>
              </div>
              {organization.location && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} /> {organization.location}
                </div>
              )}
              {crmMatch && <CrmBadge match={crmMatch} />}
            </div>
          </div>
        </td>

        {/* SIZE & SCALE Column */}
        <td>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
            👥 {organization.employeeCount ? `${organization.employeeCount.toLocaleString()} Employees` : 'Size Not Listed'}
          </div>
          {organization.revenuePrinted && (
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
              💵 Revenue: <span style={{ color: '#334155', fontWeight: 600 }}>{organization.revenuePrinted}</span>
            </div>
          )}
          {organization.foundedYear && (
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>Founded {organization.foundedYear}</div>
          )}
        </td>

        {/* TECHNOLOGY / FOCUS Column. Company search has no tech stack; it comes from enrichment (1 credit). */}
        <td>
          {organization.technologies && organization.technologies.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {organization.technologies.slice(0, 6).map((tech, idx) => (
                <span key={idx} style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', background: '#f1f5f9', color: '#0369a1', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                  {tech}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {organization.keywords && organization.keywords.length > 0 && (
                <div title={`What ${organization.name} does, from Apollo: ${organization.keywords.join(', ')}`}>
                  <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Focus</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {organization.keywords.slice(0, 4).map((k) => (
                      <span key={k} style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '999px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {organization.enriched ? (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No tech stack in Apollo</span>
              ) : onEnrichCompany && (
                <button
                  type="button"
                  onClick={() => onEnrichCompany(organization)}
                  disabled={isEnrichingCompany}
                  title="Apollo company search does not include technologies or funding. This looks them up for this company (1 Apollo credit)."
                  style={{ alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 700, padding: '4px 9px', borderRadius: 6, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', cursor: isEnrichingCompany ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                >
                  {isEnrichingCompany ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={11} />} Get tech &amp; funding · 1 credit
                </button>
              )}
            </div>
          )}
        </td>

        {/* GROWTH SIGNALS Column: only what Apollo returned for this company. */}
        <td>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {organization.headcountGrowth12m !== undefined && organization.headcountGrowth12m !== null && (
              <span
                title={[
                  organization.headcountGrowth6m != null && `6 months: ${pct(organization.headcountGrowth6m)}`,
                  `12 months: ${pct(organization.headcountGrowth12m)}`,
                  organization.headcountGrowth24m != null && `24 months: ${pct(organization.headcountGrowth24m)}`,
                ].filter(Boolean).join(' · ')}
                style={{ fontSize: '0.72rem', fontWeight: 700, width: 'fit-content', padding: '2px 7px', borderRadius: 4, ...(organization.headcountGrowth12m >= 0 ? { color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0' } : { color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }) }}
              >
                👥 Headcount {pct(organization.headcountGrowth12m)} in 12 months
              </span>
            )}
            {organization.latestFundingStage && (
              <span className="funding-badge">
                💰 {organization.latestFundingStage}{organization.latestFundingDate ? ` · ${new Date(organization.latestFundingDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
                {organization.totalFundingPrinted ? ` · ${organization.totalFundingPrinted} raised` : ''}
              </span>
            )}
            {organization.openJobsCount ? (
              <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>Hiring for {organization.openJobsCount} role{organization.openJobsCount === 1 ? '' : 's'}</span>
            ) : null}
            {organization.publicSymbol && (
              <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>📈 Public company ({organization.publicSymbol})</span>
            )}
            {organization.description && (
              <div className="why-company-box" title={organization.description}>
                {organization.description.length > 140 ? `${organization.description.slice(0, 140)}…` : organization.description}
              </div>
            )}
            {organization.headcountGrowth12m == null && !organization.latestFundingStage && !organization.openJobsCount && !organization.publicSymbol && !organization.description && (
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {organization.enriched ? 'No growth signals in Apollo' : 'No growth data in search results'}
              </span>
            )}
          </div>
        </td>

        {/* ACTIONS Column */}
        <td style={{ textAlign: 'right', paddingRight: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            {onFindDecisionMakers && (
              <button
                onClick={() => onFindDecisionMakers(organization)}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', border: 'none', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
              >
                Find People <ArrowRight size={14} />
              </button>
            )}
            
            {onAddCompanyToCrm && !crmMatch && (
              <button
                onClick={() => onAddCompanyToCrm(organization)}
                disabled={isAddingToCrm}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.78rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: isAddingToCrm ? 'not-allowed' : 'pointer', opacity: isAddingToCrm ? 0.7 : 1, transition: 'all 0.2s ease' }}
                title="Create a deal for this company in your CRM pipeline"
              >
                {isAddingToCrm ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />} Add to CRM
              </button>
            )}

            {onResearchInCompany360 && (
              <button
                onClick={() => onResearchInCompany360(organization)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.78rem', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.background = '#eff6ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f8fafc'; }}
                title="Send target account to Company 360 Workspace for deep intelligence gathering"
              >
                <Building2 size={14} /> Research in Company 360
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Fallback for Universal Provider Framework LeadItem
  if (item) {
    return (
      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <td>
          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>{item.name}</div>
          <div style={{ fontSize: '0.74rem', color: '#0284c7' }}>{item.subtitle || item.domain}</div>
        </td>
        <td><span style={{ fontSize: '0.76rem', color: '#334155' }}>{item.location || '—'}</span></td>
        <td><span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#4338ca' }}>{item.providerId}</span></td>
        <td><span style={{ fontSize: '0.74rem', color: '#047857' }}>{item.opportunityScore ? `${item.opportunityScore}/100 Intent` : '—'}</span></td>
        <td style={{ textAlign: 'right' }}>
          <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'linear-gradient(135deg, #00d09c, #0052ff)', color: '#ffffff' }}>View Lead</button>
        </td>
      </tr>
    );
  }

  return null;
}
