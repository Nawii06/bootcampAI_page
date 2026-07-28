/**
 * Shared route constants.
 *
 * The public portfolio share flow has two ends that must agree:
 *   - App.tsx registers the route (`PUBLIC_PORTFOLIO_ROUTE`)
 *   - pages/student/portfolio.tsx builds the copied share URL
 *     (`publicPortfolioPath(token)`)
 * Both derive from the single constant below so they cannot drift apart.
 */
export const PUBLIC_PORTFOLIO_ROUTE = "/public/portfolio/:token";

/** Concrete path for a given share token, e.g. `/public/portfolio/tok-1`. */
export function publicPortfolioPath(token: string): string {
  return PUBLIC_PORTFOLIO_ROUTE.replace(":token", token);
}
