import "server-only";

import type { WorkspaceContext } from "@/lib/auth/workspace";
import { getWorkspaceDocuments } from "@/lib/data/documents";
import { buildDocumentNotifications } from "@/lib/notifications";

export async function getWorkspaceNotifications(workspace: WorkspaceContext) {
  const documents = await getWorkspaceDocuments(workspace);
  return buildDocumentNotifications(documents);
}
