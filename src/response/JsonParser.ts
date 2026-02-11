export class JsonParser {
  /**
   * Enhanced JSON parsing with multiple fallback strategies
   */
  static parse<T>(input: string, expectJson: boolean = false): T | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Quick check for obvious non-JSON content
    if (expectJson && !this.looksLikeJson(input)) {
      return null;
    }

    try {
      // Strategy 1: Direct JSON parsing
      return JSON.parse(input);
    } catch {
      // Strategy 2: Extract JSON from markdown code blocks
      const markdownJson = this.extractFromMarkdown(input);
      if (markdownJson) {
        try {
          return JSON.parse(markdownJson);
        } catch {
          // Continue to next strategy
        }
      }

      // Strategy 3: Extract JSON from generic code blocks
      const genericCode = this.extractFromCodeBlock(input);
      if (genericCode) {
        try {
          return JSON.parse(genericCode);
        } catch {
          // Continue to next strategy
        }
      }

      // Strategy 4: Find JSON object by braces
      const braceMatch = this.extractByBraces(input);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch);
        } catch {
          // Continue to next strategy
        }
      }

      // Strategy 5: Try to fix common JSON issues
      const fixedJson = this.attemptJsonFixes(input);
      if (fixedJson) {
        try {
          return JSON.parse(fixedJson);
        } catch {
          // Final fallback failed
        }
      }

      return null;
    }
  }

  private static looksLikeJson(input: string): boolean {
    const trimmed = input.trim();
    return (
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      trimmed.includes('"')
    );
  }

  private static extractFromMarkdown(input: string): string | null {
    const match = input.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    return match ? match[1] : null;
  }

  private static extractFromCodeBlock(input: string): string | null {
    const match = input.match(/```\s*(\{[\s\S]*?\})\s*```/);
    return match ? match[1] : null;
  }

  private static extractByBraces(input: string): string | null {
    const match = input.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  }

  private static attemptJsonFixes(input: string): string | null {
    let fixed = input.trim();

    // Remove trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Remove single quotes and replace with double quotes (common issue)
    fixed = fixed.replace(/'/g, '"');

    // Fix unescaped quotes in strings (basic attempt)
    fixed = fixed.replace(/"\s*:\s*"([^"]*?)"/g, (match, content) => {
      const escaped = content.replace(/"/g, '\\"');
      return `: "${escaped}"`;
    });

    // Remove comments (basic removal)
    fixed = fixed.replace(/\/\/.*$/gm, '');
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

    // Validate that it looks like JSON now
    if (this.looksLikeJson(fixed)) {
      return fixed;
    }

    return null;
  }

  /**
   * Safely stringify any value to JSON
   */
  static stringify(value: unknown, pretty: boolean = false): string {
    try {
      return pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
    } catch {
      // Fallback for circular references or unstringifiable values
      return String(value);
    }
  }
}
