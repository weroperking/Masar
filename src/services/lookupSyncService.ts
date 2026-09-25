/**
 * Student lookup is hidden from the platform from the ground up.
 * All functions are no-ops to eliminate background requests, server syncs, and network calls.
 */

export async function syncAllStudentsToLookupServer(): Promise<void> {
  // Public student lookup sync disabled
  return;
}

export async function requestStudentLookupToken(
  _studentId: string,
  _payload?: any,
  _sessionToken?: string | null
): Promise<{ token: string; url: string } | null> {
  // Public student lookup token request disabled
  return null;
}
