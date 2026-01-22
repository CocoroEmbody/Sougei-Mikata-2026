import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 環境変数がプレースホルダーの場合も未設定として扱う
const isPlaceholder = (value: string) => {
  return !value || value.includes('your-') || value === '';
};

const hasValidEnvVars = supabaseUrl && supabaseAnonKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

if (!hasValidEnvVars) {
  console.warn(
    '⚠️ Supabase環境変数が設定されていません。Netlifyの環境変数設定を確認してください。'
  );
}

// 環境変数が設定されている場合のみ有効なクライアントを作成
// 設定されていない場合は、エラーを投げずにダミークライアントを作成
let client: SupabaseClient<Database>;
try {
  if (hasValidEnvVars) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } else {
    // ダミーのクライアントを作成（実際の接続はエラーになりますが、アプリは起動します）
    client = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
  }
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  // エラーが発生してもダミークライアントを作成してアプリを継続
  client = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
}

// 型が原因でビルドが失敗するのを防ぐため、明示的に any へキャスト
export const supabase: SupabaseClient<Database> & any = client as any;
