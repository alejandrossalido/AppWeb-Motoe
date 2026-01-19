-- Switch to GitHub Raw Mirror
-- Updates all IPFS, DiceBear, or NULL avatars to the fast GitHub mirror

UPDATE profiles
SET avatar_url = 'https://raw.githubusercontent.com/dli-sky/bored-ape-yacht-club-images/master/images/' || floor(random() * 1000)::text || '.png'
WHERE avatar_url LIKE '%ipfs%' 
   OR avatar_url LIKE '%dicebear%'
   OR avatar_url IS NULL
   OR avatar_url = '';
