alter table reports drop constraint reports_reason_check;

alter table reports add constraint reports_reason_check
  check (reason in ('hat', 'sexuellt', 'hot', 'mobbning', 'spam', 'farligt', 'under15', 'annat'));
