import { createClient } from './supabase/server';

export async function getSiteControl() {
  const supabase = await createClient();
  const [{ data: flags }, { data: settings }] = await Promise.all([
    supabase.from('feature_flags').select('key,enabled'),
    supabase.from('site_settings').select('key,value').eq('is_public', true),
  ]);
  const flagMap = new Map((flags ?? []).map((item) => [item.key, item.enabled]));
  const settingMap = new Map((settings ?? []).map((item) => [item.key, String(item.value ?? '')]));
  return {
    enabled: (key: string) => flagMap.get(key) ?? true,
    setting: (key: string, fallback = '') => settingMap.get(key) ?? fallback,
  };
}
