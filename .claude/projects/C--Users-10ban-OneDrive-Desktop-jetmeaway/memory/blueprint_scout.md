---
name: Blueprint Scout
description: JetMeAway's future mobile app feature — Active Neighborhood Concierge / Personal Travel Scout with hyper-local hotel intelligence
type: project
---

# Blueprint Scout — JetMeAway Mobile App (Future)

## Core Philosophy: "Life, Not Just Lodging"
The Personal Scout doesn't just sell a room — it sells the 1-mile radius around the room. Targets active, health-conscious users who don't want their routine (fitness, coffee, connectivity) interrupted by travel.

## The Deep Neighborhood Intelligence Layer

### A. The Fitness Perimeter
- Jogging Track Discovery: specific entrance to nearest green space + length of popular running loops
- Surface Intelligence: paved / gravel / trail (important for runners)
- Outdoor Gyms: Calisthenics Parks / public pull-up bars within 10-min walk
- Cycle-Hire Hubs: nearest bike-sharing dock + safest low-traffic cycling routes to city centre

### B. The Morning Ritual (Coffee & Fuel)
- Anti-Chain Filter: ignores global chains, highlights highest-rated independent Roastery within 5-min walk
- Early-Bird Check: spots that open before 7:00 AM specifically

### C. The Wellness Ecosystem
- Whole Foods / Healthy Markets: nearest fresh fruit or high-protein snacks (no mini-marts)
- Yoga & Recovery: nearest local studio or quiet zen zone in public parks

## Contextual Integration (21-Provider Glue)
- Insurance: high-rated hiking trail nearby → suggest Active Cover
- eSIM: recommend data plan with best coverage for that neighbourhood's topography
- Car Rental: if jogging track is further than 2 miles → suggest 1-day rental to reach Elite Trails

## The Scout Sidebar UI (Hotel Booking Page)
On final booking page, Scout Panel shows:
- "Scout Note: Excellent Choice!"
- "You are 200m from the river path — perfect for your 5km morning run."
- "The 'Grind & Grain' coffee shop is 3 mins away and opens at 6:30 AM."
- "We've verified a 5G signal tower is within 100m for your eSIM."

## Technical Architecture (for mobile app)
- Vercel Edge Logic: neighbourhood data fetched while user is still viewing hotel photos
- Vercel KV Sticky Memory: remembers fitness preferences, compares "Running Score" across hotels viewed
- Data source needed: Google Places API (pay-per-use, affordable at low traffic)
- KV memory: session-based first, then account-tied when login is built

## Privacy Shield
- No selling of user jogging habits to advertisers
- Personal Scout feel — cleaner, faster, more private than big travel giants
- User trust is the core differentiator

## Why: This turns jetmeaway.co.uk from a search bar into a tool that understands how a person wants to LIVE while they travel.

**Status: Saved for mobile app phase. Do not build on web yet.**
