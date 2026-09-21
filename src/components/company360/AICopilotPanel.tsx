'use client';

import { useState } from 'react';
import { askSalesCopilotAction } from '@/features/copilot/actions';
import { CopilotQuestionAnswer } from '@/features/copilot/types';
import { Company360Profile } from '@/features/company360/types';
import { Bot, Send, Sparkles, RotateCcw } from 'lucide-react';

export function AICopilotPanel({ profile }: { profile: Company360Profile }) {
  const companyName = profile.overview.companyName;
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CopilotQuestionAnswer[]>([
    {
      question: 'Should I contact this company today?',
      answer: `${companyName} has an ICP opportunity score of ${profile.opportunityScoring.overallScore}/100 (${profile.opportunityScoring.salesPriority} priority) — ${profile.opportunityScoring.salesPriority === 'HIGH' ? 'a strong target to reach out to today.' : 'worth a closer look before prioritizing outreach.'}`,
      confidencePercent: profile.opportunityScoring.confidenceScorePercent,
      reasoningSources: ['Company 360 Profile', 'Apollo Executive Lookup'],
    },
  ]);

  const quickPrompts = [
    'What services should I pitch first?',
    'Which decision maker should I contact?',
    'What problems are they likely facing?',
    'What should I avoid saying?',
  ];

  const handleAsk = async (qText: string) => {
    if (!qText.trim()) return;
    setLoading(true);
    try {
      const res = await askSalesCopilotAction(profile, qText);
      setHistory((prev) => [res, ...prev]);
      setQuestion('');
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(15,23,42,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> AI Sales Copilot & BDE Assistant
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} style={{ color: 'var(--accent-indigo)' }} /> Ask AI Copilot About {companyName}
          </h3>
        </div>
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleAsk(question); }} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask anything about ${companyName} (e.g. "Which executive should I approach first?")...`}
          style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.84rem', outline: 'none' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-indigo-hover))', color: 'var(--bg-primary)', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {loading ? <RotateCcw size={14} className="animate-spin" /> : <Send size={14} />} Ask AI
        </button>
      </form>

      {/* Quick Prompt Chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, alignSelf: 'center' }}>Suggested Prompts:</span>
        {quickPrompts.map((prompt, i) => (
          <button key={i} type="button" onClick={() => handleAsk(prompt)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: 'var(--accent-indigo)', fontWeight: 700, cursor: 'pointer' }}>
            {prompt}
          </button>
        ))}
      </div>

      {/* Answer History Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
        {history.map((item, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Q: &quot;{item.question}&quot;</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                {item.confidencePercent}% Confidence
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>{item.answer}</div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
              <span>Verified Sources:</span>
              {item.reasoningSources.map((s, i) => (
                <span key={i} style={{ color: 'var(--text-secondary)' }}>• {s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
