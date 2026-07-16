import RouteLoading from '@/components/RouteLoading';

/* Instant loading boundary — streams the moment the nav link is clicked,
   so the tap responds immediately instead of freezing until the full
   edge render + route JS arrive (owner report 2026-07-16). */
export default RouteLoading;
