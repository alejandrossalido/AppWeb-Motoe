UPDATE profiles
SET avatar_url = 'https://raw.githubusercontent.com/dli-sky/bored-ape-yacht-club-images/master/images/' || floor(random() * 9999 + 1)::text || '.png'
WHERE avatar_url LIKE '%dicebear%' 
   OR avatar_url LIKE '%ipfs%' 
   OR avatar_url IS NULL 
   OR avatar_url = '';
