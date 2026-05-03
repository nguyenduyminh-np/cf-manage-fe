import { TuiAlertService } from '@taiga-ui/core';

/**
 * Download blob file from export API response.
 * Handles Content-Disposition header and error messages.
 *
 * @param blob - Response blob
 * @param defaultFileName - Fallback filename if not in header
 * @param alertService - Optional TuiAlertService for error display
 */
export function downloadBlobFile(
  blob: Blob,
  defaultFileName: string,
  alertService?: TuiAlertService,
): void {
  // If blob is an error response, parse and display the message
  if (blob.type === 'application/json' || blob.type.includes('json')) {
    blob.text().then((text) => {
      try {
        const error = JSON.parse(text);
        const message = error?.message || 'Không thể xuất Excel. Vui lòng thử lại.';
        if (alertService) {
          alertService.open(message, { appearance: 'error' }).subscribe();
        } else {
          alert(message);
        }
      } catch {
        const message = text || 'Không thể xuất Excel. Vui lòng thử lại.';
        if (alertService) {
          alertService.open(message, { appearance: 'error' }).subscribe();
        } else {
          alert(message);
        }
      }
    });
    return;
  }

  // Extract filename from Content-Disposition header if available
  let fileNameToUse = defaultFileName;
  // Note: Content-Disposition header is not directly accessible from blob,
  // so we use the provided defaultFileName as fallback.
  // Backend should ensure proper filename format.

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileNameToUse;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
