# Screenshot Checklist

This folder holds the real application screenshots used in the repository's main [README](../../README.md#screenshots). Seven captures are included and displayed there. An additional booking-details capture is optional and has not been added.

## Screenshot Files

| Filename | Screen | What to show |
| --- | --- | --- |
| `homepage.png` | Homepage | Brand/header, aircraft hero, and flight search form |
| `flight-search.png` | Search results | A future NQY-to-LHR search with available routes, times, and fares |
| `flight-map.png` | Interactive map | A selected plane, highlighted solid/dotted route, and bottom details panel |
| `booking-review.png` | Booking review | Selected itinerary and fare, before reserving the trip |
| `my-trips.png` | Passenger dashboard | Demonstration bookings with their statuses |
| `booking-details.png` (optional; not yet added) | Booking details | A confirmed demonstration booking and itinerary |
| `sign-in.png` | Sign-in page | Shared brand/header position and sign-in form |
| `mobile.png` | Mobile homepage | Header, homepage and search form at a phone-sized viewport |

## Capture Notes

- Use actual application captures, not generated mockups.
- Use a consistent desktop viewport, for example 1440 x 900, and a mobile viewport such as 390 x 844. A separate mobile capture should reflect the narrower layout rather than a resized desktop image.
- Capture the page content, without editor panels, terminal windows, browser toolbars, or unrelated applications.
- Use the local demo accounts or fictional passenger details. Do not expose real personal information, passwords, access tokens, payment information, or environment files.
- Run the normal development setup and search a future date within the seeded 30-day timetable. Refresh the timetable if needed.
- Complete simulated checkout before capturing a confirmed booking. Do not present it as a real payment.
- Let fonts, photos, map tiles, and the details-panel entrance animation finish loading before capture.
- Keep labels and fares readable. Crop to the relevant area when a page is long; do not shrink a whole page until its text is unreadable.
- Use the exact PNG filenames above so the relative image paths work on GitHub. Optimize excessively large files without making text blurry.

## Display A Capture In The Main README

The seven existing captures are already embedded in the root README. To add another capture, place its PNG in this folder and add a descriptive image link under the appropriate heading. For example:

```markdown
![Northeastern Airways homepage with the flight search form](docs/screenshots/homepage.png)
```

The mobile image uses HTML to keep it at a readable display width without changing its proportions:

```html
<img src="docs/screenshots/mobile.png" alt="Northeastern Airways on mobile" width="300">
```

Keep descriptive image text for accessibility. Commit the real image and the README change together so GitHub never receives a link to a missing image. If adding the optional booking-details capture, include its image link and update the checklist below at the same time.

## Progress

- [x] Homepage
- [x] Flight search results
- [x] Interactive flight map
- [x] Booking review
- [x] My trips
- [ ] Booking details (optional)
- [x] Sign in
- [x] Mobile layout
