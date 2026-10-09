import type { Attachment } from '@welldot/core';
import { copyToClipboard } from '~/utils/clipboard';

const COPY_FEEDBACK_MS = 1500;

/** Display helpers plus the copy-path feedback state for attachment lists. */
export function useAttachmentDisplay() {
  const copiedAttachmentId = ref<string | null>(null);
  let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

  function attachmentIcon(mediaType: string): string {
    if (mediaType.includes('pdf')) return 'ph:file-pdf-duotone';
    if (mediaType.startsWith('image/')) return 'ph:image-duotone';
    if (mediaType.includes('word') || mediaType.includes('document'))
      return 'ph:file-doc-duotone';
    return 'ph:file-duotone';
  }

  function attachmentLabel(attachment: Attachment): string {
    return (
      attachment.filename ?? attachment.uri.split('/').at(-1) ?? attachment.uri
    );
  }

  async function copyAttachmentPath(attachment: Attachment) {
    if (!(await copyToClipboard(attachment.uri))) return;
    copiedAttachmentId.value = attachment.id;
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copiedAttachmentId.value = null;
    }, COPY_FEEDBACK_MS);
  }

  onScopeDispose(() => clearTimeout(copyResetTimer));

  return {
    copiedAttachmentId,
    attachmentIcon,
    attachmentLabel,
    copyAttachmentPath,
  };
}
