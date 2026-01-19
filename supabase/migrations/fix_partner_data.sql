-- Fix inconsistent Partner data
-- Updates any user who has 'Partner' subteam but was assigned 'member' role by mistake to have 'partner' role.

UPDATE profiles 
SET role = 'partner' 
WHERE subteam = 'Partner' AND role != 'partner';

-- Optional: Ensure 'General' branch for these users if not set
UPDATE profiles
SET branch = 'General'
WHERE subteam = 'Partner' AND branch != 'General';
