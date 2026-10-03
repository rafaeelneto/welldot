import type { Attachment } from '@welldot/core';

/**
 * Writes an attachment list onto a record (or the well root) inside an immer
 * draft. An empty list removes the member, so files never carry `[]`.
 */
export function assignAttachments(
  owner: { attachments?: Attachment[] } | undefined,
  list: Attachment[] | undefined,
): void {
  if (!owner) return;
  if (list?.length) owner.attachments = list;
  else delete owner.attachments;
}
