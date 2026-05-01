import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  locale?: 'he' | 'en' | 'ru';
}

export default function Breadcrumbs({ items, locale = 'he' }: BreadcrumbsProps) {
  const isRtl = locale === 'he';
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol
        className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"
        dir={isRtl ? 'rtl' : 'ltr'}
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={item.href}
              className="flex items-center gap-1.5"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && <Chevron size={14} className="shrink-0 text-[var(--color-text-tertiary)]" />}
              {isLast ? (
                <span
                  className="text-[var(--color-text-primary)] font-medium"
                  itemProp="name"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-[var(--color-accent)] transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
