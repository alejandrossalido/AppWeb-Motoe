-- Update all IPFS avatars to use DiceBear (Bottts)
-- Generates a deterministic avatar based on the user ID
UPDATE profiles
SET avatar_url = 'https://api.dicebear.com/9.x/bottts/svg?seed=' || id
WHERE avatar_url ILIKE '%ipfs%';
