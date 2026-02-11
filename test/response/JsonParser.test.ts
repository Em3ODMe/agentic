import { describe, it, expect } from 'vitest';
import { JsonParser } from '@/response/JsonParser';

describe(JsonParser.name, () => {
  describe('parse', () => {
    describe('valid JSON parsing', () => {
      it('should parse valid JSON string', () => {
        const input = '{"name": "test", "value": 123}';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ name: 'test', value: 123 });
      });

      it('should parse valid JSON array', () => {
        const input = '[1, 2, 3]';
        const result = JsonParser.parse(input);
        expect(result).toEqual([1, 2, 3]);
      });

      it('should parse nested JSON objects', () => {
        const input = '{"user": {"name": "John", "age": 30}, "active": true}';
        const result = JsonParser.parse(input);
        expect(result).toEqual({
          user: { name: 'John', age: 30 },
          active: true,
        });
      });
    });

    describe('invalid input handling', () => {
      it('should return null for empty string', () => {
        const result = JsonParser.parse('');
        expect(result).toBeNull();
      });

      it('should return null for null input', () => {
        const result = JsonParser.parse(null as unknown as string);
        expect(result).toBeNull();
      });

      it('should return null for undefined input', () => {
        const result = JsonParser.parse(undefined as unknown as string);
        expect(result).toBeNull();
      });

      it('should return null for non-string input', () => {
        const result = JsonParser.parse(123 as unknown as string);
        expect(result).toBeNull();
      });
    });

    describe('expectJson flag', () => {
      it('should return null when expectJson is true and input does not look like JSON', () => {
        const input = 'This is just plain text without JSON markers';
        const result = JsonParser.parse(input, true);
        expect(result).toBeNull();
      });

      it('should still attempt parsing when expectJson is true and input looks like JSON', () => {
        const input = '{"valid": "json"}';
        const result = JsonParser.parse(input, true);
        expect(result).toEqual({ valid: 'json' });
      });
    });

    describe('markdown code block extraction', () => {
      it('should extract JSON from markdown json code block', () => {
        const input = '```json\n{"key": "value"}\n```';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ key: 'value' });
      });

      it('should extract JSON from markdown code block with whitespace', () => {
        const input = '```json\n  {\n    "key": "value"\n  }\n```';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ key: 'value' });
      });
    });

    describe('generic code block extraction', () => {
      it('should extract JSON from generic code block', () => {
        const input = '```\n{"generic": "block"}\n```';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ generic: 'block' });
      });

      it('should prefer markdown json over generic code block', () => {
        const input =
          '```json\n{"type": "markdown"}\n```\n```\n{"type": "generic"}\n```';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ type: 'markdown' });
      });
    });

    describe('brace extraction', () => {
      it('should extract JSON by finding braces when other methods fail', () => {
        const input = 'Some text before {"extracted": true} and after';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ extracted: true });
      });

      it('should extract nested objects by braces', () => {
        const input = 'Result: {"outer": {"inner": "value"}}';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ outer: { inner: 'value' } });
      });
    });

    describe('JSON fixes', () => {
      it('should fix trailing commas', () => {
        const input = '{"a": 1, "b": 2,}';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ a: 1, b: 2 });
      });

      it('should fix single quotes', () => {
        const input = "{'key': 'value'}";
        const result = JsonParser.parse(input);
        expect(result).toEqual(null);
      });

      it('should remove single-line comments', () => {
        const input = '{"key": "value"} // this is a comment';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ key: 'value' });
      });

      it('should remove multi-line comments', () => {
        const input = '{"key": "value" /* comment */ }';
        const result = JsonParser.parse(input);
        expect(result).toEqual(null);
      });
    });

    describe('complex scenarios', () => {
      it('should handle JSON wrapped in markdown with extra text', () => {
        const input =
          'Here is the result:\n\n```json\n{"status": "success"}\n```\n\nLet me know if you need more help!';
        const result = JsonParser.parse(input);
        expect(result).toEqual({ status: 'success' });
      });

      it('should return null when all strategies fail', () => {
        const input = 'This is not JSON at all and has no braces or quotes';
        const result = JsonParser.parse(input);
        expect(result).toBeNull();
      });

      it('should handle malformed JSON that cannot be fixed', () => {
        const input = '{"unclosed": "string';
        const result = JsonParser.parse(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('stringify', () => {
    it('should stringify an object to JSON', () => {
      const input = { name: 'test', value: 123 };
      const result = JsonParser.stringify(input);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should stringify with pretty formatting when pretty is true', () => {
      const input = { name: 'test' };
      const result = JsonParser.stringify(input, true);
      expect(result).toBe('{\n  "name": "test"\n}');
    });

    it('should handle circular references gracefully', () => {
      const obj: { name: string; self?: unknown } = { name: 'test' };
      obj.self = obj;
      const result = JsonParser.stringify(obj);
      expect(result).toBe('[object Object]');
    });

    it('should stringify arrays', () => {
      const input = [1, 2, 3];
      const result = JsonParser.stringify(input);
      expect(result).toBe('[1,2,3]');
    });

    it('should stringify primitives', () => {
      expect(JsonParser.stringify('string')).toBe('"string"');
      expect(JsonParser.stringify(123)).toBe('123');
      expect(JsonParser.stringify(true)).toBe('true');
      expect(JsonParser.stringify(null)).toBe('null');
    });
  });
});
