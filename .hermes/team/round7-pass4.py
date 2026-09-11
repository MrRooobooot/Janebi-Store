#!/usr/bin/env python3
"""Pass 4: collapse double-opacity artifacts + remaining literal fixes."""
import re, glob

files = [f for f in glob.glob('src/**/*.tsx', recursive=True)
         if not f.startswith(('src/pages/admin/', 'src/components/admin/'))
         and '/admin/' not in f]

LIT = [
 ('src/pages/Home.tsx',
  'from-amber-500/10 via-[var(--color-cta)]/10/15 to-amber-500/10 dark:from-amber-600/20 dark:via-[var(--color-cta)]/10/20 dark:to-amber-600/20',
  'from-[var(--color-cta)]/10 via-[var(--color-accent-surface)]/15 to-[var(--color-cta)]/10 dark:from-[var(--color-cta)]/20 dark:via-[var(--color-accent-surface)]/15 dark:to-[var(--color-cta)]/20'),
 ('src/pages/static/Offers.tsx',
  'from-rose-600 via-[var(--color-cta)]/10 to-amber-600',
  'from-rose-600 via-[var(--color-accent-surface)] to-[var(--color-cta-hover)]'),
 ('src/components/profile/VipClubTab.tsx',
  'from-amber-500 via-[var(--color-cta)]/10 to-amber-600',
  'from-[var(--color-cta)] via-[var(--color-accent-surface)] to-[var(--color-cta-hover)]'),
 ('src/components/Header.tsx', '<Sun className="h-5 w-5 text-amber-400" />', '<Sun className="h-5 w-5 text-amber-400" />'),
]
for path, old, new in LIT:
    s = open(path).read()
    if old in s and old != new:
        open(path, 'w').write(s.replace(old, new))
        print('lit:', path)

n = 0
for path in files:
    s = open(path).read(); o = s
    # collapse /NN/MM double opacity after var token] — keep FIRST value, scaled contextually:
    # map: /40/10 -> /10, /40/5 -> /5, /25/50 -> /40, /25/30 -> /40, /25/20 -> /25, /30/50 -> /50,
    #      /10/80 -> /80, /10/10 -> /10, /20/20 -> /20, /10/30 -> /30, /10/40 -> /40, /10/70 -> /70
    pairs = [('/40/10', '/10'), ('/40/5', '/5'), ('/25/50', '/40'), ('/25/30', '/40'),
             ('/25/20', '/25'), ('/30/50', '/50'), ('/10/80', '/80'), ('/10/10', '/10'),
             ('/20/20', '/20'), ('/10/30', '/30'), ('/10/40', '/40'), ('/10/70', '/70'),
             ('/10/20', '/20'), ('/30/30', '/30'), ('/40/40', '/40')]
    for a, b in pairs:
        s = s.replace(a + ' ', b + ' ').replace(a + '"', b + '"').replace(a + "'", b + "'")
    if s != o:
        open(path, 'w').write(s); n += 1
print(n, 'double-opacity files cleaned')
