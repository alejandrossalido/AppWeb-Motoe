UPDATE profiles
SET avatar_url = 'https://cloudflare-ipfs.com/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/' || floor(random() * 9999)::text
WHERE avatar_url LIKE '%dicebear%' 
   OR avatar_url LIKE '%ipfs%' 
   OR avatar_url LIKE '%githubusercontent%'
   OR avatar_url IS NULL 
   OR avatar_url = '';
