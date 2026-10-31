
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import fixXMLString from '../../../lib/svgforge/utils/fix-xml-string.js';
import XmlFixingError from '../../../lib/svgforge/errors/xml-fixing-error.js';

describe('testing fixing svg string', () => {
  it('should return valid svg file on svg with one multiline attribute values', () => {
    assert.strictEqual(fixXMLString(`<svg viewBox="0 0 16
                                     16"></svg>`), '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"/>');
  });

  it('should return valid svg file on svg with few multiline attribute values', () => {
    assert.strictEqual(fixXMLString(`<svg fill="r
                                                            e
                                                            d"
                                                            viewBox="0 0 16
                                                                                                 16"></svg>`), '<svg fill="r e d" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"/>');
  });

  it('should return valid svg file on svg with multiple multiline attribute values', () => {
    assert.strictEqual(fixXMLString(`<svg fill="r
                                                            e
                                                            d"
                                                            viewBox="0
                                                            0
                                                            16
                                                            16"></svg>`), '<svg fill="r e d" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"/>');
  });

  it('should return same string on valid svg', () => {
    assert.strictEqual(fixXMLString('<svg viewBox="0 0 16 16"></svg>'), '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"/>');
  });

  it('should throw an error on invalid file', () => {
    assert.throws(() => {
      fixXMLString('<svg viewBox=></svg>');
    }, XmlFixingError);
  });

  it('should keep the generic message and attach the parser error as the cause', () => {
    let thrown;

    try {
      fixXMLString('<svg viewBox=></svg>');
    } catch (error) {
      thrown = error;
    }

    assert.ok(thrown instanceof XmlFixingError);
    assert.strictEqual(thrown.message, 'Invalid XML string');
    assert.ok(thrown.cause instanceof Error);
    assert.ok(thrown.cause.message.length > 0);
  });
});
