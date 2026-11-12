import { openDB } from 'idb';
import type { JournalData, JournalEntry, Source } from '../types';

const DB_NAME = 'reading-journal-db';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('sources')) db.createObjectStore('sources', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'id' });
  },
});

export async function getAllData(): Promise<JournalData> {
  const db = await dbPromise;
  const [sources, entries] = await Promise.all([db.getAll('sources'), db.getAll('entries')]);
  return { sources, entries };
}

export async function saveSource(source: Source) {
  const db = await dbPromise;
  await db.put('sources', source);
}

export async function deleteSource(id: string) {
  const db = await dbPromise;
  const tx = db.transaction(['sources', 'entries'], 'readwrite');
  await tx.objectStore('sources').delete(id);
  const entries = await tx.objectStore('entries').getAll();
  await Promise.all(entries.filter((entry: JournalEntry) => entry.sourceId === id).map((entry: JournalEntry) => tx.objectStore('entries').delete(entry.id)));
  await tx.done;
}

export async function saveEntry(entry: JournalEntry) {
  const db = await dbPromise;
  await db.put('entries', entry);
}

export async function deleteEntry(id: string) {
  const db = await dbPromise;
  await db.delete('entries', id);
}

export async function replaceAllData(data: JournalData) {
  const db = await dbPromise;
  const tx = db.transaction(['sources', 'entries'], 'readwrite');
  await Promise.all([tx.objectStore('sources').clear(), tx.objectStore('entries').clear()]);
  await Promise.all(data.sources.map((item) => tx.objectStore('sources').put(item)));
  await Promise.all(data.entries.map((item) => tx.objectStore('entries').put(item)));
  await tx.done;
}
