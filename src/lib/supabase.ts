import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 環境変数がプレースホルダーの場合も未設定として扱う
const isPlaceholder = (value: string) => {
  return !value || value.includes('your-') || value === '';
};

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  console.warn(
    '⚠️ Supabase環境変数が設定されていません。.env.localファイルに実際の値を設定してください。'
  );
}

// ダミーのクライアントを作成（実際の接続はエラーになりますが、アプリは起動します）
export const supabase = supabaseUrl && supabaseAnonKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
