-- Fix Bored Ape Extension
-- Switches to Cloudflare and removes .png extension from URLs

UPDATE profiles
SET avatar_url = 'https://cloudflare-ipfs.com/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhIUfsppMynagfW6xS/' || floor(random() * 9999)::text
WHERE avatar_url LIKE '%ipfs%' 
   OR avatar_url LIKE '%dicebear%';
