/**
 * Page state store (src/lib/usePageState.ts): searches and results stay when the user leaves a page
 * and comes back. Runs in Node with a stand-in for the browser tab's sessionStorage.
 *
 * Run with: npx tsx tests/page-state-test.ts
 */

class FakeStorage {
  data = new Map<string, string>();
  full = false;
  get length() { return this.data.size; }
  key(i: number) { return Array.from(this.data.keys())[i] ?? null; }
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) {
    if (this.full) throw new Error('QuotaExceededError');
    this.data.set(k, String(v));
  }
  removeItem(k: string) { this.data.delete(k); }
}

const tab = new FakeStorage();
(globalThis as unknown as { window: unknown }).window = { sessionStorage: tab };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(` ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(` ❌ FAIL: ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function main() {
  const { readPageState, writePageState, hasPageState, clearPageState, forgetPageMemoryForTests } = await import('../src/lib/usePageState');

  await test('Results saved after leaving the page are there on return', () => {
    // The search finishes while the page is closed: its setter still writes to the store.
    writePageState('linkedin.posts', [{ id: 'p1' }]);
    const back = readPageState<{ id: string }[]>('linkedin.posts', []);
    assert(back.length === 1 && back[0].id === 'p1', 'posts restored');
  });

  await test('Searches survive a page refresh (kept in the tab)', () => {
    writePageState('apollo.jobTitle', 'CTO');
    forgetPageMemoryForTests(); // what a reload does
    assert(readPageState<string>('apollo.jobTitle', '') === 'CTO', 'filter read back from the tab');
    assert(hasPageState('linkedin.posts'), 'saved results are reported as restored');
  });

  await test('Loading flags do not survive a refresh, so no page is stuck on "Searching…"', () => {
    writePageState('linkedin.postsLoading', true, false);
    assert(readPageState<boolean>('linkedin.postsLoading', false, false) === true, 'kept while navigating');
    forgetPageMemoryForTests();
    assert(readPageState<boolean>('linkedin.postsLoading', false, false) === false, 'reset after a refresh');
    assert(tab.getItem('bdos:page:v3:linkedin.postsLoading') === null, 'never written to the tab');
  });

  await test('Opening a page without searching does not count as restored results', () => {
    readPageState('apollo.companyResults', []);
    assert(!hasPageState('apollo.companyResults'), 'a default that was only read is not a saved result');
  });

  await test('Repeated reads return the same object (no endless re-renders)', () => {
    const fallback: string[] = [];
    assert(readPageState('x.list', fallback) === readPageState('x.list', []), 'same reference');
  });

  await test('Full tab storage still keeps results for this visit', () => {
    tab.full = true;
    try {
      writePageState('discovery.data', { leads: 3 });
      assert(readPageState<{ leads: number } | null>('discovery.data', null)?.leads === 3, 'kept in memory');
    } finally {
      tab.full = false;
    }
  });

  await test('Signing out clears saved searches and keeps unrelated tab data', () => {
    tab.setItem('other-app-key', 'keep me');
    writePageState('apollo.peopleResults', [{ name: 'A' }]);
    clearPageState();
    assert(readPageState('apollo.peopleResults', null) === null, 'results gone from memory');
    assert(!Array.from(tab.data.keys()).some((k) => k.startsWith('bdos:page:v3:')), 'results gone from the tab');
    assert(tab.getItem('other-app-key') === 'keep me', 'other data untouched');
  });

  console.log(`\n Page state tests: ${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main();
