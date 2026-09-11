#!/usr/bin/env python3
"""Pass 2: fix the leftovers + malformed double-opacity produced by pass 1."""
import re

FIXES = [
    # malformed /10/30, /10/40, /10/20, /10/50 double opacity
    (r'/10/(\d+)', r'/10'),
    # dark hover tints -> cta token tints
    ('dark:hover:bg-orange-900/20', 'dark:hover:bg-[var(--color-cta)]/20'),
    ('dark:hover:bg-orange-950/30', 'dark:hover:bg-[var(--color-cta)]/20'),
    ('dark:hover:bg-orange-950/50', 'dark:hover:bg-[var(--color-cta)]/20'),
    ('dark:hover:bg-orange-950/40', 'dark:hover:bg-[var(--color-cta)]/20'),
    ('dark:bg-orange-900/60', 'dark:bg-[var(--color-cta)]/20'),
    ('dark:bg-orange-900/30', 'dark:bg-[var(--color-cta)]/20'),
    ('dark:bg-orange-950/30', 'dark:bg-[var(--color-cta)]/10'),
    # light-orange text on dark gradient cards -> white-ish emphasis
    ('text-orange-100', 'text-orange-100-KEEP'),  # temp marker (on-CTA text, keep readable)
    ('text-orange-100-KEEP', 'text-white/90'),
    ('text-orange-200', 'text-white/80'),
    # misc fills
    ('bg-orange-500 shadow-md', 'bg-[var(--color-cta)] shadow-md'),
    ("onlyDiscounted ? 'bg-orange-500'", "onlyDiscounted ? 'bg-[var(--color-cta)]'"),
    ('fill-orange-500', 'fill-[var(--color-cta)]'),
    ('bg-orange-600 dark:bg-orange-400', 'bg-[var(--color-cta)] dark:bg-[var(--color-accent-surface)]'),
    ('hover:border-orange-100', 'hover:border-[var(--color-cta)]/40'),
    ('hover:bg-orange-200', 'hover:bg-[var(--color-cta)]/20'),
    ('border-orange-100/80', 'border-[var(--color-cta)]/30'),
    ('border-orange-100', 'border-[var(--color-cta)]/30'),
    ('bg-orange-200/50', 'bg-[var(--color-cta)]/20'),
    ('text-orange-800', 'text-[var(--color-emphasis-text)]'),
    ('shadow-[0_0_8px_rgba(234,88,12,0.8)]', 'shadow-[0_0_8px_rgba(194,65,12,0.8)]'),
    ('dark:shadow-[0_0_8px_rgba(251,146,60,0.8)]', 'dark:shadow-[0_0_8px_rgba(244,124,32,0.8)]'),
    # ChatWidget typing dots
    ('w-1.5 h-1.5 bg-orange-500 rounded-full', 'w-1.5 h-1.5 bg-[var(--color-accent-surface)] rounded-full'),
]

import glob
files = [f for f in glob.glob('src/**/*.tsx', recursive=True)
         if not f.startswith(('src/pages/admin/', 'src/components/admin/'))
         and '/admin/' not in f]
changed = []
for path in files:
    s = open(path).read(); orig = s
    for pat, rep in FIXES:
        s = re.sub(pat, rep, s)
    if s != orig:
        open(path, 'w').write(s)
        changed.append(path)
print(len(changed), 'files')
for p in changed: print(' ', p)
