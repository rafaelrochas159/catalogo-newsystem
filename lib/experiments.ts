import crypto from 'crypto';
import { createRequiredServerClient } from '@/lib/supabase/client';
import { trackUserEvent } from '@/lib/marketing';

type ExperimentVariant = {
  key: string;
  [key: string]: unknown;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function buildIdentityKey(params: {
  userId?: string | null;
  email?: string | null;
  anonymousId?: string | null;
}) {
  if (params.userId) return `user:${params.userId}`;
  const email = normalizeEmail(params.email);
  if (email) return `email:${email}`;
  if (params.anonymousId) return `anon:${params.anonymousId}`;
  return `guest:${crypto.randomUUID()}`;
}

function pickVariant(identityKey: string, testKey: string, variants: ExperimentVariant[]) {
  if (!variants.length) return null;

  const hash = crypto
    .createHash('sha256')
    .update(`${identityKey}:${testKey}`)
    .digest('hex');

  const numeric = parseInt(hash.slice(0, 8), 16);
  return variants[numeric % variants.length] || variants[0];
}

export async function assignExperiments(params: {
  path: string;
  userId?: string | null;
  email?: string | null;
  anonymousId?: string | null;
}) {
  const db = createRequiredServerClient() as any;
  const email = normalizeEmail(params.email);
  const identityKey = buildIdentityKey(params);

  const { data: tests } = await db
    .from('ab_tests')
    .select('*')
    .eq('status', 'ACTIVE');

  const matchingTests = (tests || []).filter((test: any) => {
    const routes = Array.isArray(test.target_routes) ? test.target_routes : [];
    return routes.length === 0 || routes.includes(params.path);
  });

  const assignments: Record<string, string> = {};

  await Promise.all(
    matchingTests.map(async (test: any) => {
      const variants = Array.isArray(test.variants) ? test.variants : [];
      const variant = pickVariant(identityKey, test.key, variants);
      if (!variant?.key) return;

      assignments[test.key] = String(variant.key);

      await db
        .from('ab_test_assignments')
        .upsert(
          {
            test_id: test.id,
            test_key: test.key,
            identity_key: identityKey,
            user_id: params.userId || null,
            email,
            anonymous_id: params.anonymousId || null,
            route: params.path,
            variant_key: variant.key,
            last_exposed_at: new Date().toISOString(),
            metadata: {
              path: params.path,
            },
          },
          { onConflict: 'test_id,identity_key' },
        );

      await trackUserEvent({
        userId: params.userId || null,
        email,
        anonymousId: params.anonymousId || null,
        eventName: 'experiment_exposure',
        page: params.path,
        metadata: {
          testKey: test.key,
          variantKey: variant.key,
        },
      });
    }),
  );

  return assignments;
}
