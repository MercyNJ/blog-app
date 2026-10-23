import { useEffect } from "react";

// Defaults come from index.html, so the site title and description live in one place.
const DEFAULT_TITLE = document.title;
const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

// Sets the page's browser-tab title and meta description, restoring the defaults when the page is left.
export function usePageMeta(title, description) {
  useEffect(() => {
    const descriptionTag = document.querySelector('meta[name="description"]');

    document.title = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    descriptionTag?.setAttribute('content', description || DEFAULT_DESCRIPTION);

    return () => {
      document.title = DEFAULT_TITLE;
      descriptionTag?.setAttribute('content', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
