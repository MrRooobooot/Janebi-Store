## 2026-08-17 - [Add ARIA labels to icon-only buttons]
**Learning:** Icon-only buttons (like mobile hamburger menus, theme toggles, clear search, remove item) are frequently missed during initial development but are critical for screen reader users. Adding dynamic aria-labels (e.g., 'بستن منو' vs 'باز کردن منو' depending on state) significantly improves the experience.
**Action:** Always check interactive icon-only elements for `aria-label` attributes and consider dynamic labels where the icon's function changes based on state.
