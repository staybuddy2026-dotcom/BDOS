import { OmniChannelOutreachPackage } from './types';
import { logger } from '@/lib/logger';

/**
 * Single-Click Omni-Channel Outreach Generator.
 * Generates Cold Email, LinkedIn InMail, WhatsApp pitch, Followups, Proposal Intro & Meeting Agenda simultaneously.
 */
export function generateOmniChannelOutreachPackage(
  companyName: string = 'Acme Healthcare Systems',
  domain: string = 'acmehealth.com',
  targetContactName: string = 'Dr. Rajesh Kumar',
  targetContactTitle: string = 'Chief Technology Officer'
): OmniChannelOutreachPackage {
  logger.info(`Omni-Channel Outreach Generator: Generating 6-touch campaign package for '${targetContactName}' (${companyName})...`);

  const firstName = targetContactName.split(' ')[0];

  return {
    id: `omni_${Date.now()}`,
    companyName,
    targetContactName,
    targetContactTitle,
    coldEmail: {
      subject: `Accelerating ${companyName}'s (${domain}) React 19 Patient Portal Roadmap`,
      body: `Hi ${firstName},\n\nI noticed ${companyName}'s recent $12.5M Series A funding round and your active push to recruit Senior React 19 & Node.js engineers.\n\nAt Tiny Script Soft Tech, we deploy pre-vetted, senior full-stack squads capable of plugging into your architecture within 48 hours.\n\nWould you be open to a 10-minute technical sync this Thursday at 3 PM IST?\n\nBest regards,\nBDE Lead | Tiny Script Soft Tech`,
    },
    linkedInInMail: {
      subject: `Senior React 19 & Node.js Squad for ${companyName}`,
      message: `Hi ${firstName}, congratulations on the recent Series A! We specialize in deploying high-velocity React 19 & Node.js development squads. Would love to share our recent healthcare microservices case study.`,
    },
    whatsAppMessage: `Hi ${firstName}, Akash here from Tiny Script Soft Tech. Noticed ${companyName}'s engineering expansion for your React 19 portal. We have a 2-engineer senior squad ready for immediate deployment. Can we sync briefly today?`,
    followupSequence: [
      { day: 3, message: `Hi ${firstName}, following up on my note regarding our React 19 senior squad availability.` },
      { day: 7, message: `Hi ${firstName}, sharing our free Microservices Migration Audit blueprint for ${companyName}.` },
      { day: 14, message: `Hi ${firstName}, closing loop for now. Let me know when engineering squad scaling is top of mind.` },
    ],
    proposalIntro: `Tiny Script Soft Tech is pleased to submit this commercial proposal for allocating a dedicated 2-Engineer Senior React 19 & Node.js Squad to ${companyName}.`,
    meetingAgenda: [
      '1. Review Current Engineering Bottlenecks & Architecture Stack',
      '2. Discuss React 19 / Next.js 16 Squad Deployment Framework',
      '3. Review Fixed-Price SOW Budget & 12-Week Delivery Roadmap',
    ],
  };
}
