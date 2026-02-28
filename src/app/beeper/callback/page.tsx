'use client';

/**
 * /beeper/callback — Client-side OAuth callback page for Beeper Desktop.
 *
 * After the user approves in Beeper Desktop, Beeper redirects here with
 * ?code=...&state=...  This page:
 *   1. Reads code + state from the URL
 *   2. Loads OAuth params (codeVerifier, clientId, apiUrl, redirectUri) from
 *      sessionStorage (stored by the settings page before the redirect)
 *   3. Exchanges the code for an access token by calling Beeper Desktop's
 *      /oauth/token endpoint directly from the browser (not the server)
 *   4. POSTs the access token to /api/beeper/configure with skipTest: true
 *   5. Redirects to /settings?connected=true
 *
 * Everything involving http://localhost:23373 happens here in the browser,
 * which can reach the user's local Beeper Desktop — unlike the Vercel server.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function BeeperCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting Beeper Desktop…');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      router.push('/settings?beeper_error=authorization_denied');
      return;
    }

    if (!code || !state) {
      router.push('/settings?beeper_error=no_code');
      return;
    }

    async function completeOAuth() {
      try {
        // Load OAuth params stored by the settings page before the redirect
        const stored = sessionStorage.getItem('beeper_oauth');
        if (!stored) {
          router.push('/settings?beeper_error=no_code_verifier');
          return;
        }

        const { codeVerifier, clientId, apiUrl, redirectUri } = JSON.parse(stored) as {
          codeVerifier: string;
          clientId: string;
          apiUrl: string;
          redirectUri: string;
        };

        // One-time use — clear immediately
        sessionStorage.removeItem('beeper_oauth');

        setMessage('Exchanging authorization code with Beeper Desktop…');

        // Exchange code for token — browser calls Beeper Desktop directly
        let accessToken: string;
        try {
          const tokenRes = await fetch(`${apiUrl}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: code!,
              redirect_uri: redirectUri,
              client_id: clientId,
              code_verifier: codeVerifier,
            }),
          });

          if (!tokenRes.ok) {
            console.error('[BeeperCallback] Token exchange failed:', await tokenRes.text());
            router.push('/settings?beeper_error=token_exchange_failed');
            return;
          }

          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token as string;

          if (!accessToken) {
            router.push('/settings?beeper_error=no_token');
            return;
          }
        } catch (err) {
          console.error('[BeeperCallback] Could not reach Beeper Desktop for token exchange:', err);
          setStatus('error');
          setMessage(
            'Could not reach Beeper Desktop to complete the connection. ' +
            'Make sure Beeper Desktop is still running and try again.'
          );
          return;
        }

        setMessage('Saving connection…');

        // Save to server — skipTest because the server cannot reach localhost:23373
        const saveRes = await fetch('/api/beeper/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiUrl, accessToken, skipTest: true }),
        });

        if (!saveRes.ok) {
          router.push('/settings?beeper_error=server_error');
          return;
        }

        setStatus('success');
        setMessage('Beeper Desktop connected!');
        setTimeout(() => router.push('/settings?connected=true'), 1500);
      } catch (err) {
        console.error('[BeeperCallback] Unexpected error:', err);
        router.push('/settings?beeper_error=server_error');
      }
    }

    completeOAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <p className="text-gray-800 font-semibold">Beeper Desktop connected!</p>
            <p className="text-gray-500 text-sm mt-1">Redirecting to settings…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-gray-800 font-semibold mb-2">Connection failed</p>
            <p className="text-gray-500 text-sm">{message}</p>
            <button
              onClick={() => router.push('/settings')}
              className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function BeeperCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <BeeperCallbackContent />
    </Suspense>
  );
}
