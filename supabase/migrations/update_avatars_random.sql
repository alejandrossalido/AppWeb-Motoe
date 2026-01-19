-- Update existing users to have a random Bored Ape if they have no avatar or a DiceBear one
-- We use a DO block to iterate or just a simple update with a random number generator.

-- First, ensure pgcrypto is available for random generation if needed, or just use random().
-- The BAYC CID is QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0
-- URL format: https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0/[0-9999].png

UPDATE public.profiles
SET avatar_url = 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0/' || floor(random() * 10000)::text || '.png'
WHERE avatar_url IS NULL 
   OR avatar_url LIKE '%dicebear%'
   OR avatar_url = '';

-- Note: This only affects the public.profiles table. 
-- If auth.users metadata needs update, it's trickier, but the app primarily reads from profiles.
-- To be safe, we might mostly care about profiles.
