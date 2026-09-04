import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from './lib/supabase/config';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    const { data: betaFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('key', 'testing.full_access')
      .maybeSingle();

    if (betaFlag?.enabled) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.user) {
        await supabase
          .from('members')
          .update({ status: 'active', joined_at: new Date().toISOString().slice(0, 10) })
          .eq('id', data.user.id);
      }
    }
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
