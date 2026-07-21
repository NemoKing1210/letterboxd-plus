export function getFilmContext() {
  if (!document.body.matches('[data-type="film"][data-tmdb-id]')) return null;

  const title =
    document.querySelector('meta[name="production:name"]')?.content?.trim() || '';
  const titleAndYear =
    document.querySelector('meta[name="production:name-and-year"]')?.content || '';
  const yearMatch = titleAndYear.match(/\((\d{4})\)\s*$/);
  const tmdbId = document.body.dataset.tmdbId;

  if (!title || !tmdbId) return null;
  return {
    key: `tmdb:${tmdbId}`,
    title,
    year: yearMatch ? Number(yearMatch[1]) : null,
  };
}
