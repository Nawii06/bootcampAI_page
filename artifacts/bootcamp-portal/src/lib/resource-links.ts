/**
 * Maps an audit-log resource to the admin list page that can display it,
 * producing a deep link with ?highlight=<id> so DataTable scrolls to and
 * highlights the exact row (see useHighlightParam / DataTable.highlightId).
 *
 * Only resource types whose id matches a row id on a highlight-enabled
 * admin list are mapped; anything else returns undefined and should be
 * rendered as plain text.
 */
const RESOURCE_LIST_ROUTES: Record<string, string> = {
  PROGRAM: "/admin/programs",
  PROGRAM_APPLICATION: "/admin/applications",
  COMPANY: "/admin/partners",
  COMPLETION_ASSESSMENT: "/admin/completion",
  STORED_FILE: "/admin/evidence",
  PERFORMANCE_INDICATOR: "/admin/performance/indicators",
  PERFORMANCE_RESULT: "/admin/performance/results",
};

export function resourceHighlightLink(
  resourceType: string | null | undefined,
  resourceId: string | null | undefined,
): string | undefined {
  if (!resourceType || !resourceId) return undefined;
  const route = RESOURCE_LIST_ROUTES[resourceType];
  if (!route) return undefined;
  return `${route}?highlight=${encodeURIComponent(resourceId)}`;
}
