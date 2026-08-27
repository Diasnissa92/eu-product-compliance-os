export function getSafeAuthDestination(requestedNext: string | null | undefined) {
  return requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/onboarding";
}
