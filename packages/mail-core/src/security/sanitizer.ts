export interface SanitizeOptions {
  blockRemoteImages?: boolean;
  proxyImageUrl?: string;
}

export class EmailSanitizer {
  /**
   * Cleans and sanitizes raw email HTML content for safe rendering in browser
   */
  public static sanitize(html: string, options: SanitizeOptions = {}): { cleanHtml: string; blockedImageCount: number } {
    if (!html) return { cleanHtml: '', blockedImageCount: 0 };

    let blockedImageCount = 0;
    let clean = html;

    // 1. Strip <script> tags and inline Javascript
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/javascript:[^"']*/gi, '#unsafe-js-blocked');

    // 2. Strip event handlers (onload, onerror, onclick, etc.)
    clean = clean.replace(/\son[a-zA-Z]+\s*=\s*(['"]).*?\1/gi, '');
    clean = clean.replace(/\son[a-zA-Z]+\s*=\s*[^ >]+/gi, '');

    // 3. Strip dangerous elements: <iframe>, <object>, <embed>, <base>, <form>
    clean = clean.replace(/<\/?(iframe|object|embed|base|form|input|button)\b[^>]*>/gi, '');

    // 4. Handle remote images: block by default to protect privacy against tracking pixels
    if (options.blockRemoteImages !== false) {
      clean = clean.replace(/<img\b([^>]*?)src=(['"])(https?:\/\/[^'"]+)\2([^>]*)>/gi, (_, before, quote, src, after) => {
        blockedImageCount++;
        return `<img ${before}src=${quote}data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23f1f5f9"/></svg>${quote} data-remote-blocked="true" class="blocked-remote-image" ${after}>`;
      });

      // Strip CSS background urls
      clean = clean.replace(/url\(\s*(['"]?)(https?:\/\/[^"')]+)\1\s*\)/gi, () => {
        blockedImageCount++;
        return 'none';
      });
    }

    // 5. Ensure all links open in a new tab with noopener noreferrer
    clean = clean.replace(/<a\b([^>]*?)href=(['"])(.*?)\2([^>]*)>/gi, (_, before, quote, href, after) => {
      return `<a ${before}href=${quote}${href}${quote} target="_blank" rel="noopener noreferrer"${after}>`;
    });

    return {
      cleanHtml: clean,
      blockedImageCount,
    };
  }
}
