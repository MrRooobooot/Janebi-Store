#!/usr/bin/env python3
"""Pass 3: amber triage. Keep SEMANTIC warnings; convert accents/decor to CTA family."""
import re, glob

FILES = [f for f in glob.glob('src/**/*.tsx', recursive=True)
         if not f.startswith(('src/pages/admin/', 'src/components/admin/'))
         and '/admin/' not in f]

# Per-file, per-occurrence decisions: (file, exact old substring -> new)
EXACT = [
    # --- ACCENT / DECOR (convert) ---
    ('src/components/ProductReviews.tsx', 'to-amber-500 text-white font-black', 'to-[var(--color-accent-surface)] text-white font-black'),
    ('src/components/ProductReviews.tsx', 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400',
     'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 border border-[var(--color-cta)]/40 dark:border-[var(--color-cta)]/40 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'),
    ('src/components/auth/AuthModal.tsx', 'bg-amber-500/10 rounded-full blur-2xl', 'bg-[var(--color-cta)]/10 rounded-full blur-2xl'),
    ('src/components/PageLoadingFallback.tsx', 'via-amber-400', 'via-[var(--color-accent-surface)]'),
    ('src/components/LatestReviews.tsx', "text-amber-500 fill-amber-500", 'text-[var(--color-emphasis-text)] fill-[var(--color-emphasis-text)]'),
    ('src/components/ProductCard.tsx', 'bg-amber-500/90 backdrop-blur-xs', 'bg-[var(--color-accent-surface)]/90 backdrop-blur-xs'),
    ('src/components/ProductCard.tsx', "? 'text-amber-600 dark:text-amber-400'", "? 'text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'"),
    ('src/components/ProductCard.tsx', "? 'text-amber-400'", "? 'text-[var(--color-emphasis-text)]'"),
    ('src/components/Footer.tsx', 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
     'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'),
    ('src/components/Footer.tsx', 'to-amber-50 dark:from-zinc-900', 'to-[var(--color-cta)]/5 dark:from-zinc-900'),
    ('src/components/profile/ProfileSidebar.tsx', 'from-amber-500 to-[var(--color-cta)]/10', 'from-[var(--color-cta)] to-[var(--color-accent-surface)]'),
    ('src/components/profile/OrderHistoryTab.tsx', "'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'",
     "'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'"),
    ('src/components/profile/DashboardOverviewTab.tsx', 'text-amber-300 animate-pulse', 'text-white/80 animate-pulse'),
    ('src/components/profile/DashboardOverviewTab.tsx', 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
     'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'),
    ('src/components/profile/DashboardOverviewTab.tsx', "'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'",
     "'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'"),
    ('src/components/profile/VipClubTab.tsx', 'from-amber-500 via-[var(--color-cta)]/10 to-amber-600', 'from-[var(--color-cta)] via-[var(--color-accent-surface)] to-[var(--color-cta-hover)]'),
    ('src/components/profile/VipClubTab.tsx', 'text-amber-200', 'text-white/80'),
    ('src/components/profile/VipClubTab.tsx', 'text-amber-100', 'text-white/90'),
    ('src/components/Header.tsx', '<Sun className="h-5 w-5 text-amber-400" />', '<Sun className="h-5 w-5 text-amber-400" />'),  # keep: sun icon in dark mode = sun semantic? -> convert below
    ('src/components/Header.tsx', 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30',
     'text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)] hover:bg-[var(--color-cta)]/10 dark:hover:bg-[var(--color-cta)]/20'),
    ('src/pages/Login.tsx', 'text-amber-800 dark:text-amber-300', 'text-amber-800 dark:text-amber-300'),  # keep (warning box)
    ('src/pages/Home.tsx', 'dark:text-amber-400', 'dark:text-[var(--color-emphasis-text)]'),
    ('src/pages/Home.tsx', 'from-amber-500/10 via-[var(--color-cta)]/10 to-amber-500/10 dark:from-amber-600/20 dark:via-[var(--color-cta)]/10 dark:to-amber-600/20',
     'from-[var(--color-cta)]/10 via-[var(--color-accent-surface)]/10 to-[var(--color-cta)]/10 dark:from-[var(--color-cta)]/20 dark:via-[var(--color-accent-surface)]/15 dark:to-[var(--color-cta)]/20'),
    ('src/pages/Home.tsx', 'bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400',
     'bg-[var(--color-cta)]/20 border border-[var(--color-cta)]/40 flex items-center justify-center text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'),
    ('src/pages/Home.tsx', 'border-amber-500/30', 'border-[var(--color-cta)]/30'),
    ('src/pages/Home.tsx', 'to-amber-50/40', 'to-[var(--color-cta)]/5'),
    ('src/pages/static/Contact.tsx', 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
     'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'),
    ('src/pages/static/NewProducts.tsx', 'text-amber-300', 'text-white/80'),
    ('src/pages/static/Blog.tsx', 'to-amber-50 dark:from-zinc-800', 'to-[var(--color-cta)]/5 dark:from-zinc-800'),
    ('src/pages/static/Blog.tsx', 'to-amber-500 rounded-l-full', 'to-[var(--color-accent-surface)] rounded-l-full'),
    ('src/pages/static/Offers.tsx', 'via-[var(--color-cta)]/10 to-amber-600', 'via-[var(--color-accent-surface)] to-[var(--color-cta-hover)]'),
    ('src/pages/static/Offers.tsx', 'text-amber-300 animate-pulse', 'text-white/80 animate-pulse'),
    ('src/pages/static/Offers.tsx', '<Clock className="h-4 w-4 text-amber-400" />', '<Clock className="h-4 w-4 text-white/80" />'),
    ('src/pages/ProductDetail.tsx', '<Award className="h-5 w-5 text-amber-500 shrink-0" />', '<Award className="h-5 w-5 text-[var(--color-emphasis-text)] shrink-0" />'),
    ('src/pages/ProductDetail.tsx', 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-extrabold border border-amber-200 dark:border-amber-900/50',
     'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)] text-xs font-extrabold border border-[var(--color-cta)]/40 dark:border-[var(--color-cta)]/40'),
    ('src/pages/ForcedPasswordChange.tsx', 'bg-amber-500/10 rounded-full blur-2xl', 'bg-[var(--color-cta)]/10 rounded-full blur-2xl'),
    ('src/pages/ForcedPasswordChange.tsx', 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
     'bg-[var(--color-cta)]/10 dark:bg-[var(--color-cta)]/20 text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)]'),
    ('src/pages/ForcedPasswordChange.tsx', 'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
     'focus:border-[var(--color-cta)] focus:ring-2 focus:ring-[var(--color-cta)]/20'),
]

changed = []
for path, old, new in EXACT:
    s = open(path).read()
    if old in s and old != new:
        s = s.replace(old, new)
        open(path, 'w').write(s)
        changed.append(path)
print(len(changed), 'files patched')
