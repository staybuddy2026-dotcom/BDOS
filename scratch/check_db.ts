import { db } from '../src/lib/db';

async function checkDb() {
  try {
    const settings = await db.applicationSettings.findMany();
    console.log('--- DB ApplicationSettings records ---');
    console.log(JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error reading DB settings:', err);
  } finally {
    await db.$disconnect();
  }
}

checkDb();
