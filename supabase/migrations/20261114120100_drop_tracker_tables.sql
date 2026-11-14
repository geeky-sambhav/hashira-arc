-- The 52-week tracker (item statuses, lab evidence, time log, flashcard
-- schedule and its settings) was replaced by the checklist in sheet_state.
-- This removes its tables and every row in them. It cannot be undone.

drop table if exists
  public.review_log,
  public.card_state,
  public.time_log,
  public.lab_evidence,
  public.item_progress,
  public.app_settings;
