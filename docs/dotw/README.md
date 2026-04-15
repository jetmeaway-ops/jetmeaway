# DOTW / WebBeds API — Integration Notes

Notes from reading the DOTWconnect v4 documentation (PDF in Downloads, full text at `dotw-v4-full.txt`). Distilled for our integration work, not a reproduction of the docs.

## What this actually is

DOTW = Destinations of the World. One of the three brands Webbeds owns alongside Webbeds itself and Sunhotels. Our signed contract with Webbeds FZ-LLC covers all three. This PDF is specifically the DOTW XML API, called **DCML** (DOTWconnect Markup Language).

It is XML, not JSON. POST requests to a gateway URL, responses come back as XML. Gzip compression is mandatory. Passwords are sent MD5-hashed.

## Connection details

Test server: `xmldev.dotwconnect.com`
Production server: `us.dotwconnect.com`
Endpoint path: `/gatewayV4.dotw` (v4) or `/request.dotw` (docs use both interchangeably)
Method: POST
Content-Type: text/xml
Compression: gzip (required)

Every request starts with a `<customer>` wrapper containing username, md5(password), company id, `<source>1</source>`, `<product>hotel</product>` and a `<request command="...">` element.

## The 9 hotel commands

1. **searchhotels** — search availability by city + dates + occupancy. Returns hotels with cheapest rate per meal plan.
2. **getrooms** — mandatory in v4. Called TWICE in the booking flow: first without blocking to fetch all rates + cancellation policies + the allocationDetails token, then a second time WITH blocking to lock the rate for 3 minutes.
3. **savebooking** — optional. Saves an itinerary that can be confirmed later with bookitinerary.
4. **confirmbooking** — confirms the booking using the allocationDetails token from the second getrooms call.
5. **bookitinerary** — confirms a previously-saved booking.
6. **getbookingdetails** — retrieve details of an existing booking.
7. **cancelbooking** — cancel a booking.
8. **deleteitinerary** — delete a saved (not yet confirmed) itinerary.
9. **searchbookings** — list/search existing bookings.

## Booking flow in plain English

Two supported flows. Our code only needs to implement one. The simpler one is:

```
searchhotels        → get list of hotels with cheapest price per meal plan
getrooms (no block) → get full rates + cancellation policy + allocationDetails token
getrooms (block)    → lock the rate for 3 minutes, get refreshed allocationDetails
confirmbooking      → finalise the booking, pass allocationDetails from blocking step
```

The longer flow (save first, confirm later) adds `savebooking` between the second getrooms and a `bookitinerary` instead of `confirmbooking`. We do not need this for now — our customers pay at checkout, not later.

## Two important v4 differences from v3

1. `searchhotels` response is stripped down. No cancellation policy, no allocationDetails. You MUST call `getrooms` to get those.
2. The rate-blocking getrooms step is now mandatory. Webbeds uses this window to validate price and cancellation policy against the underlying supplier. Without blocking, you cannot safely confirm.

## What we need before writing any code

1. **Test credentials** — username, password, company id. Get from Anthony Potts. He said five days after contract signing, then ~14 days for the key. We are in that window now.
2. **Agree product scope** — we only need `hotel` product for now. Other products (transfers, tours) are out of scope.
3. **Pick a test city** — docs warn not all hotels are in the test environment. We will try Dubai first (DOTW is Dubai-based, best test coverage).

## Integration plan on our side

New file: `src/lib/dotw.ts` — a thin client wrapper that handles:
- XML serialisation of the `<customer>` envelope
- MD5 hashing of the password
- Gzip compression on request, gzip decompression on response
- XML parsing of the response (use `fast-xml-parser`, already common in node ecosystem)
- Retry + timeout logic (Webbeds recommend 30-second timeout, 1 retry on network error)

New supplier adapter: `src/lib/suppliers/dotw-adapter.ts` — converts DOTW's search response into our unified Hotel shape so it merges with LiteAPI results. Giata IDs come through in the DOTW response, which is exactly why we picked Giata as the de-dupe key.

New API route: no new route needed. Plug DOTW into the existing `/api/hotels` search, run it in parallel with LiteAPI, merge by Giata.

Booking path: extend `/api/hotels/book` to route the booking to DOTW when the winning offer came from DOTW. Block → confirm in a single server action to keep within the 3-minute window.

## Things to watch out for

- **Rate blocking is only 3 minutes.** Our checkout must complete inside that window. If the customer lingers, the block expires and we need to re-quote.
- **XML cases are strict.** Element and attribute names are case-sensitive. Get them wrong and the API silently fails to parse.
- **Data retention.** DOTW requires us to log every booking and cancellation for at least 6 months. We already do this in Vercel KV, no extra work.
- **Test environment rates are stale.** Do not build UI decisions on test prices being realistic. Once live, expect materially different pricing.
- **Not all hotels are in test.** If a property does not return results in test, it is probably just not provisioned there. Try other properties.

## Next action

Wait for test credentials from Anthony (roughly 2 weeks). While waiting, scaffold `src/lib/dotw.ts` with a working MD5 + gzip + XML envelope, and build a mock `searchhotels` response so we can unit-test the adapter before real credentials arrive.
