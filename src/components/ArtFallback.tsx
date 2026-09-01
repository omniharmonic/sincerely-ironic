/**
 * Stands in when a product has no photograph yet.
 *
 * It is deliberately not art. The drawn garments were retired from every
 * customer-facing surface so that what the site shows is the mockup of the
 * thing the printer actually makes; a fallback that looked like a product
 * would put that guarantee back at risk. Just the name, quietly.
 */
export function ArtFallback({ title }: { title: string }) {
  return (
    <span className="art-fallback">
      <span className="display art-fallback__title">{title}</span>
    </span>
  );
}
