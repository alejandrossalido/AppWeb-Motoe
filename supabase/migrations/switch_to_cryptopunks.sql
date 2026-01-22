UPDATE profiles
SET avatar_url = 'https://raw.githubusercontent.com/ethereumdegen/cryptopunk-icons/master/app/assets/punk' || floor(random() * 10000)::text || '.png'
WHERE avatar_url LIKE '%ipfs%' 
   OR avatar_url LIKE '%dicebear%' 
   OR avatar_url LIKE '%github%'
   OR avatar_url LIKE '%rickandmorty%'
   OR avatar_url IS NULL;
