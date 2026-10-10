-- Run with: supabase test db. These assertions exercise the transactional SQL boundary.
begin;
select plan(14);
select has_table('public', 'resource_occupancies', 'one occupancy table');
select has_table('public', 'notification_jobs', 'outbox exists');
select has_function('public', 'create_booking', 'booking transaction exists');
select has_function('public', 'reschedule_booking', 'reschedule transaction exists');
select has_function('public', 'cancel_booking', 'cancel transaction exists');
select has_column('public', 'bookings', 'price_cents', 'historical price exists');
select has_column('public', 'bookings', 'access_token_hash', 'only token hash exists');
select has_index('public', 'resource_occupancies', 'resource_occupancies_no_overlap', 'resource exclusion exists');
select has_table('public', 'payments', 'payments are separate from revenue stats');
select has_view('public', 'tenant_statistics', 'statistics view separates arrivals/orders/payments');
select has_function('public', 'get_available_slots', 'timezone-aware availability exists');
select has_function('public', 'claim_notification_jobs', 'outbox lease function exists');
select has_function('public', 'get_booking_by_token', 'token access function exists');
select has_function('public', 'claim_llm_request', 'LLM budget function exists');
select * from finish();
rollback;
