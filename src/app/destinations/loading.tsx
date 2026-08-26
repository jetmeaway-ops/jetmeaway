import RouteLoading from '@/components/RouteLoading';

/* Instant loading boundary — streams the moment the nav link is clicked,
   so the tap responds immediately instead of freezing until the full
   edge render + route JS arrive (dead-tap report 2026-08-26; same pattern
   as the category pages' boundaries from 2026-07-16). */
export default RouteLoading;
