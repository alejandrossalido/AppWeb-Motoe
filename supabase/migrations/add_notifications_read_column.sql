-- Add `read` column to notifications table (safe: only adds if not exists)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

-- Add `created_at` column if missing (for ordering)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id, created_at DESC);

-- Enable Realtime on the notifications table (required for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
