export type EntryType = 'insight' | 'question' | 'critique' | 'lesson';

export interface Source {
  id: string;
  title: string;
  author: string;
  kind: 'book' | 'article' | 'video' | 'course' | 'other';
  status: 'reading' | 'finished' | 'paused' | 'want-to-read';
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface JournalEntry {
  id: string;
  sourceId: string | null;
  title: string;
  content: string;
  type: EntryType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface JournalData {
  sources: Source[];
  entries: JournalEntry[];
}
