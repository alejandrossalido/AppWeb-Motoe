-- Restore Bored Apes with correct Images CID
-- Replaces DiceBear or old IPFS links with the new correct Ape URL format

UPDATE profiles
SET avatar_url = 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhIUfsppMynagfW6xS/' || floor(random() * 9999)::text || '.png'
WHERE avatar_url LIKE '%dicebear%' 
   OR avatar_url LIKE '%ipfs%';
