-- Fix infinite recursion in profiles RLS policies
-- These policies were calling functions that queried profiles, causing a loop.
-- We are dropping them in favor of the simpler 'profiles_select_policy'.

DROP POLICY IF EXISTS "Profiles Lectura Basada en Rol" ON public.profiles;
DROP POLICY IF EXISTS "Partners can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
