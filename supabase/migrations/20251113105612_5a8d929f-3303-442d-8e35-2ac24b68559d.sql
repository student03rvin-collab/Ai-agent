-- Add CHECK constraints to profiles table for data integrity
ALTER TABLE public.profiles 
  ADD CONSTRAINT full_name_length CHECK (length(full_name) <= 100);

ALTER TABLE public.profiles 
  ADD CONSTRAINT avatar_url_length CHECK (length(avatar_url) <= 500);