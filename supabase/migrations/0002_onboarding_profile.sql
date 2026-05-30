-- Onboarding profile fields captured during signup flow
alter table users add column if not exists role text;
alter table users add column if not exists use_case text;
alter table users add column if not exists referral_source text;
