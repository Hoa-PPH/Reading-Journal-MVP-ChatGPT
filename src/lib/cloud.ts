import type { JournalData, JournalEntry, Source } from '../types';
import { supabase } from './supabase';

// Dữ liệu được lưu theo user_id. RLS trong supabase/schema.sql giới hạn mỗi người chỉ thấy dữ liệu của mình.
export async function pullCloudData(userId: string): Promise<JournalData> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const [sourceResult, entryResult] = await Promise.all([
    supabase.from('sources').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('entries').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);
  if (sourceResult.error) throw sourceResult.error;
  if (entryResult.error) throw entryResult.error;
  return {
    sources: (sourceResult.data ?? []).map((row: any): Source => ({ id: row.id, title: row.title, author: row.author ?? '', kind: row.kind, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, userId: row.user_id })),
    entries: (entryResult.data ?? []).map((row: any): JournalEntry => ({ id: row.id, sourceId: row.source_id, title: row.title, content: row.content, type: row.type, tags: row.tags ?? [], createdAt: row.created_at, updatedAt: row.updated_at, userId: row.user_id })),
  };
}

export async function pushCloudData(userId: string, data: JournalData) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const sources = data.sources.map((item) => ({ id: item.id, user_id: userId, title: item.title, author: item.author, kind: item.kind, status: item.status, created_at: item.createdAt, updated_at: item.updatedAt }));
  const entries = data.entries.map((item) => ({ id: item.id, user_id: userId, source_id: item.sourceId, title: item.title, content: item.content, type: item.type, tags: item.tags, created_at: item.createdAt, updated_at: item.updatedAt }));
  if (sources.length) {
    const { error } = await supabase.from('sources').upsert(sources);
    if (error) throw error;
  }
  if (entries.length) {
    const { error } = await supabase.from('entries').upsert(entries);
    if (error) throw error;
  }
}
