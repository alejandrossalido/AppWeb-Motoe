-- Update all existing random avatars to use Cloudflare IPFS
-- Matches any avatar that looks like an IPFS link (ipfs.io or otherwise) containing the BAYC CID
-- ALso catches NULL or empty strings

-- 1. Update existing ipfs.io links to cloudflare-ipfs.com
UPDATE public.profiles
SET avatar_url = REPLACE(avatar_url, 'https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/')
WHERE avatar_url LIKE 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0%';

-- 2. Assign random Bored Ape to users with NULL, empty, or old DiceBear avatars
UPDATE public.profiles
SET avatar_url = 'https://cloudflare-ipfs.com/ipfs/QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0/' || floor(random() * 10000)::text || '.png'
WHERE avatar_url IS NULL 
   OR avatar_url = ''
   OR avatar_url LIKE '%dicebear%'
   OR avatar_url LIKE '%ui-avatars%';
