UPDATE profiles
SET avatar_url = 'https://raw.githubusercontent.com/dli-sky/bored-ape-yacht-club-images/master/images/' || floor(random() * 9999 + 1)::text || '.png'
WHERE (avatar_url ILIKE '%ipfs%') 
   OR (avatar_url ILIKE '%dicebear%') 
   OR (avatar_url IS NULL)
   OR (avatar_url = '');
