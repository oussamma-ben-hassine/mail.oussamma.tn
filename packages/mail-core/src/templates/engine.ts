export interface TemplateRenderResult {
  rendered: string;
  missingVariables: string[];
}

export class TemplateEngine {
  /**
   * Escape HTML entities to prevent XSS in email clients
   */
  public static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Resolves nested property path (e.g. "user.profile.name")
   */
  private static resolveValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.trim().split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Render template with variables, loops and conditional blocks
   */
  public static render(template: string, variables: Record<string, any> = {}): TemplateRenderResult {
    const missingVariables = new Set<string>();

    let output = template;

    // 1. Process conditional blocks: {{#if condition}}...{{/if}}
    output = output.replace(/\{\{#if\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      const val = this.resolveValue(variables, key);
      return val ? content : '';
    });

    // 2. Process unless blocks: {{#unless condition}}...{{/unless}}
    output = output.replace(/\{\{#unless\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, key, content) => {
      const val = this.resolveValue(variables, key);
      return !val ? content : '';
    });

    // 3. Process loop blocks: {{#each items}}...{{/each}}
    output = output.replace(/\{\{#each\s+([a-zA-Z0-9_.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, loopContent) => {
      const list = this.resolveValue(variables, key);
      if (!Array.isArray(list) || list.length === 0) return '';
      return list.map(item => {
        let itemRendered = loopContent;
        if (typeof item === 'object' && item !== null) {
          itemRendered = itemRendered.replace(/\{\{this\.([a-zA-Z0-9_.]+)\}\}/g, (__: string, prop: string) => {
            const v = this.resolveValue(item, prop);
            return v !== undefined ? this.escapeHtml(String(v)) : '';
          });
        } else {
          itemRendered = itemRendered.replace(/\{\{this\}\}/g, this.escapeHtml(String(item)));
        }
        return itemRendered;
      }).join('');
    });

    // 4. Process unescaped variables: {{{rawHtml}}}
    output = output.replace(/\{\{\{([a-zA-Z0-9_.]+)\}\}\}/g, (_, key) => {
      const val = this.resolveValue(variables, key);
      if (val === undefined || val === null) {
        missingVariables.add(key);
        return '';
      }
      return String(val);
    });

    // 5. Process standard escaped variables: {{name}}
    output = output.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, key) => {
      const val = this.resolveValue(variables, key);
      if (val === undefined || val === null) {
        missingVariables.add(key);
        return '';
      }
      return this.escapeHtml(String(val));
    });

    return {
      rendered: output,
      missingVariables: Array.from(missingVariables),
    };
  }
}
