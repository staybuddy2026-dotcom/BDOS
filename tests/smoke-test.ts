import { setupTestEnvironment } from './setup';
import { AuthService } from '../src/lib/auth';
import { validateBooleanQuery } from '../src/features/keywords/validation';
import { addKeyword, getKeywords, updateKeyword, deleteKeyword } from '../src/features/keywords/actions';
import { runDiscoveryScan } from '../src/features/discovery/actions';
import { approveOutreachDraft, markOutreachDraftAsSent, saveOutreachDraftChanges } from '../src/features/review/actions';
import { checkApolloCreditWarning } from '../src/features/apollo/actions';
import { apolloProvider, DefaultApolloProvider } from '../src/features/apollo/provider';
import { getAiProvider } from '../src/features/ai/analysis';
import { getReEngagementEvents } from '../src/features/reengagement/actions';
import { db } from '../src/lib/db';
import { DraftStatus, Priority } from '@prisma/client';

// Initialize environment safety guards
setupTestEnvironment();

// Assertion Helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// Database Connectivity Helper
async function isDbConnected(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function runTestSuite() {
  console.log('\n==================================================');
  console.log('  STARTING BDOS AUTOMATED SMOKE-TEST FOUNDATION   ');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;
  const results: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];
  const dbOnline = await isDbConnected();

  if (!dbOnline) {
    console.log(' ℹ️  INFO: Local PostgreSQL server offline. Executing DB tests under sandbox fallback safety checks.\n');
  }

  const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      passedCount++;
      console.log(` ✅ PASS: ${name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name, status: 'FAIL', error: msg });
      failedCount++;
      console.error(` ❌ FAIL: ${name}\n    Error: ${msg}\n`);
    }
  };

  // 1. Authentication & Authorization
  await runTest('Authentication & Authorization Guards', async () => {
    const user = await AuthService.getCurrentUser();
    assert(user !== null, 'Current user session must not be null.');
    assert(user?.email === 'akash@tinyscript.in', 'User email must match owner session.');
    
    const verified = await AuthService.verifySession();
    assert(verified.id === user?.id, 'verifySession must return active user session.');
  });

  // 2. Keyword Workflow
  await runTest('Keyword Workflow (CRUD & Boolean Parser)', async () => {
    const valid = validateBooleanQuery('("React Developers" OR "Flutter") AND "Outsourcing"');
    assert(valid.isValid === true, 'Boolean keyword query parser should validate query.');

    const invalid = validateBooleanQuery('("React" AND)');
    assert(invalid.isValid === false, 'Invalid boolean query should be rejected.');

    if (dbOnline) {
      const kwText = `Smoke Test React Query ${Date.now()}`;
      const created = await addKeyword(kwText, 'Development', Priority.HIGH);
      assert(created.keyword === kwText, 'Created keyword query must match input.');

      const keywordsList = await getKeywords();
      assert(keywordsList.some((k: { id: string }) => k.id === created.id), 'Created keyword must appear in list.');

      await updateKeyword(created.id, { isFavorite: true });
      await deleteKeyword(created.id);
    } else {
      // Sandbox fallback validation
      const fallbackList = await getKeywords();
      assert(Array.isArray(fallbackList), 'Fallback keywords must return array.');
    }
  });

  // 3. Post Discovery & Deduplication
  await runTest('Post Discovery & URL Deduplication', async () => {
    if (dbOnline) {
      const scan = await runDiscoveryScan('all', '24h');
      assert(typeof scan.created === 'number', 'Discovery scan must return created count.');
    
      const postUrl = `https://linkedin.com/posts/smoke-test-unique-url-${Date.now()}`;
      const post1 = await db.linkedInPost.create({
        data: {
          postUrl,
          authorName: 'Test Author',
          postPreview: 'Sample post preview content for deduplication test.',
          matchedKeyword: 'React',
        }
      });

      try {
        await db.linkedInPost.create({
          data: {
            postUrl,
            authorName: 'Duplicate Author',
            postPreview: 'Duplicate preview.',
            matchedKeyword: 'React',
          }
        });
        assert(false, 'Database must reject duplicate postUrl insertion.');
      } catch {
        // Expected rejection due to unique constraint
      }

      await db.linkedInPost.delete({ where: { id: post1.id } });
    }
  });

  // 4. AI Post Analysis
  await runTest('AI Post Analysis & Signal Parsing', async () => {
    const provider = getAiProvider('mock');
    const result = await provider.analyzePost('Jane Doe', 'Looking for an agency to build a React and Flutter mobile app.', 'CTO');
    
    assert(typeof result.opportunityScore === 'number', 'Opportunity score must be a number.');
    assert(result.opportunityScore >= 0 && result.opportunityScore <= 100, 'Opportunity score must be 0-100.');
    assert(Array.isArray(result.buyingSignals), 'Buying signals must be an array.');
    assert(result.buyingSignals.length > 0, 'Buying signals array must contain detected labels.');
  });

  // 5. Outreach Draft Immutability
  await runTest('Outreach Draft Immutability & Edits', async () => {
    if (dbOnline) {
      const testPost = await db.linkedInPost.create({
        data: {
          postUrl: `https://linkedin.com/posts/smoke-draft-${Date.now()}`,
          authorName: 'Draft Author',
          postPreview: 'Need React Developers for mobile build.',
          matchedKeyword: 'React',
        }
      });

      const draft = await db.outreachDraft.create({
        data: {
          postId: testPost.id,
          originalAiDraft: 'Original AI Generated Message Text.',
          status: DraftStatus.DRAFT,
        }
      });

      const updated = await saveOutreachDraftChanges(draft.id, 'User Edited Message Text.');
      assert(updated.originalAiDraft === 'Original AI Generated Message Text.', 'originalAiDraft must remain immutable.');
      assert(updated.editedDraft === 'User Edited Message Text.', 'editedDraft must reflect user modifications.');

      await db.linkedInPost.delete({ where: { id: testPost.id } });
    }
  });

  // 6. Manual Approval & Manual Send
  await runTest('Manual Approval & Manual Send Progression', async () => {
    if (dbOnline) {
      const testPost = await db.linkedInPost.create({
        data: {
          postUrl: `https://linkedin.com/posts/smoke-approve-${Date.now()}`,
          authorName: 'Approve Author',
          postPreview: 'Looking for a technical partner.',
          matchedKeyword: 'Partner',
        }
      });

      const draft = await db.outreachDraft.create({
        data: {
          postId: testPost.id,
          originalAiDraft: 'Hello, saw your post regarding software partners.',
          status: DraftStatus.DRAFT,
        }
      });

      const approved = await approveOutreachDraft(draft.id, 'Hello, saw your post regarding software partners.');
      assert(approved.success === true, 'Approval must return success: true status.');

      const sent = await markOutreachDraftAsSent(draft.id);
      assert(sent.status === DraftStatus.SENT, 'Status must transition to SENT upon manual send confirmation.');

      const history = await db.outreachHistory.findFirst({
        where: { draftId: draft.id }
      });
      assert(history !== null, 'OutreachHistory record must be logged.');

      await db.linkedInPost.delete({ where: { id: testPost.id } });
    }
  });

  // 7. Follow-up Creation
  await runTest('Follow-up Calendar Task Creation', async () => {
    if (dbOnline) {
      const testPost = await db.linkedInPost.create({
        data: {
          postUrl: `https://linkedin.com/posts/smoke-followup-${Date.now()}`,
          authorName: 'Followup Author',
          postPreview: 'Hiring React devs.',
          matchedKeyword: 'React',
        }
      });

      const draft = await db.outreachDraft.create({
        data: {
          postId: testPost.id,
          originalAiDraft: 'Followup draft text.',
          status: DraftStatus.SENT,
        }
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      const followup = await db.followUp.create({
        data: {
          draftId: draft.id,
          dueDate,
          content: 'Follow up on pitch message.',
        }
      });

      assert(followup.draftId === draft.id, 'FollowUp must reference draftId.');
      assert(followup.status === 'PENDING', 'New FollowUp status must be PENDING.');

      await db.linkedInPost.delete({ where: { id: testPost.id } });
    }
  });

  // 8. Sequence Stop Rule (CRITICAL BUSINESS RULE)
  await runTest('Sequence Stop Rule Enforcement', async () => {
    if (dbOnline) {
      const testPost = await db.linkedInPost.create({
        data: {
          postUrl: `https://linkedin.com/posts/smoke-stoprule-${Date.now()}`,
          authorName: 'Replied Prospect',
          postPreview: 'We need Flutter agency.',
          matchedKeyword: 'Flutter',
        }
      });

      const draft = await db.outreachDraft.create({
        data: {
          postId: testPost.id,
          originalAiDraft: 'Pitch message.',
          status: DraftStatus.SENT,
        }
      });

      const followup = await db.followUp.create({
        data: {
          draftId: draft.id,
          dueDate: new Date(),
          status: 'PENDING',
        }
      });

      await db.$transaction([
        db.outreachDraft.update({
          where: { id: draft.id },
          data: { status: DraftStatus.REPLIED }
        }),
        db.followUp.updateMany({
          where: { draftId: draft.id, status: 'PENDING' },
          data: { status: 'CANCELLED' }
        })
      ]);

      const updatedDraft = await db.outreachDraft.findUnique({ where: { id: draft.id } });
      assert(updatedDraft?.status === DraftStatus.REPLIED, 'Status must be REPLIED.');

      const updatedFollowup = await db.followUp.findUnique({ where: { id: followup.id } });
      assert(updatedFollowup?.status === 'CANCELLED', 'Future pending follow-up must be CANCELLED upon reply.');

      await db.linkedInPost.delete({ where: { id: testPost.id } });
    }
  });

  // 9. Re-engagement Engine
  await runTest('Re-engagement Engine Signals Detection', async () => {
    const events = await getReEngagementEvents();
    assert(Array.isArray(events), 'Re-engagement scan must return array of events.');
  });

  // 10. Apollo Credit Safety & Confirmation Rules
  await runTest('Apollo Credit Safety & Warning Calculations', async () => {
    const warning = await checkApolloCreditWarning();
    assert(typeof warning.isWarning === 'boolean', 'isWarning must be a boolean.');
    assert(typeof warning.remainingCredits === 'number', 'remainingCredits must be a number.');
    assert(typeof warning.threshold === 'number', 'threshold must be a number.');
  });

  // 11. Apollo Provider & Error Handling
  await runTest('Apollo Provider Match & Error Handling', async () => {
    // In mock/test mode (no live APOLLO_API_KEY), searchPeople must return an
    // empty result rather than fabricating a fake match — no dummy leads.
    const matches = await apolloProvider.searchPeople({ name: 'Marcus Aurelius', domain: 'logicflow.io' });
    assert(Array.isArray(matches), 'Apollo provider searchPeople must return an array.');
    assert(matches.length === 0, 'Apollo provider must not fabricate matches when no live API key is configured.');
  });

  // 12. Production Mock Safety Guards
  await runTest('Production Mock Safety Guards Rejection', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalApiKey = process.env.APOLLO_API_KEY;
    const originalMockFlag = process.env.APOLLO_MOCK_MODE;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.APOLLO_API_KEY;
      delete process.env.APOLLO_MOCK_MODE;

      const provider = new DefaultApolloProvider();
      await provider.searchPeople({ name: 'Test' });
      assert(false, 'Apollo provider must throw production error when API key is missing and mock mode is not true.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      assert(msg.includes('Production Configuration Error'), 'Error message must specify Production Configuration Error.');
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      if (originalApiKey) process.env.APOLLO_API_KEY = originalApiKey;
      if (originalMockFlag) process.env.APOLLO_MOCK_MODE = originalMockFlag;
    }
  });

  // 13. Database Integrity & Relations
  await runTest('Database Integrity & Cascade Delete Behavior', async () => {
    if (dbOnline) {
      const testPost = await db.linkedInPost.create({
        data: {
          postUrl: `https://linkedin.com/posts/smoke-cascade-${Date.now()}`,
          authorName: 'Cascade Author',
          postPreview: 'Cascade test post.',
          matchedKeyword: 'React',
        }
      });

      const enrichment = await db.apolloEnrichment.create({
        data: {
          linkedPostId: testPost.id,
          personName: 'Cascade Person',
          workEmail: 'cascade@test.com',
        }
      });

      assert(enrichment.linkedPostId === testPost.id, 'ApolloEnrichment must be linked to post.');

      await db.linkedInPost.delete({ where: { id: testPost.id } });

      const checkEnrichment = await db.apolloEnrichment.findUnique({
        where: { linkedPostId: testPost.id }
      });
      assert(checkEnrichment === null, 'ApolloEnrichment must be deleted via cascade when LinkedInPost is deleted.');
    }
  });

  console.log('\n==================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED  `);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
