-- Force update all IPFS avatars to use Pinata Gateway
-- Preserves custom uploads (supabase storage)

UPDATE public.profiles
SET avatar_url = 'https://gateway.pinata.cloud/ipfs/QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0/' || floor(random() * 10000)::text || '.png'
WHERE avatar_url ILIKE '%ipfs%'
  AND avatar_url NOT ILIKE '%supabase%'
  AND avatar_url NOT ILIKE '%storage%';
