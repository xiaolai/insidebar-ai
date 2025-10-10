// Tests for text injection into provider textareas
import { describe, it, expect, beforeEach } from 'vitest';
import { findTextInputElement, injectTextIntoElement } from '../modules/text-injector.js';

describe('text-injector module', () => {
  describe('findTextInputElement', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('should find a simple textarea by selector', () => {
      const textarea = document.createElement('textarea');
      textarea.id = 'prompt-textarea';
      container.appendChild(textarea);

      const found = findTextInputElement('#prompt-textarea');
      expect(found).toBe(textarea);
    });

    it('should find a contenteditable element', () => {
      const div = document.createElement('div');
      div.className = 'ql-editor';
      div.setAttribute('contenteditable', 'true');
      container.appendChild(div);

      const found = findTextInputElement('.ql-editor');
      expect(found).toBe(div);
    });

    it('should return null if element not found', () => {
      const found = findTextInputElement('.non-existent');
      expect(found).toBeNull();
    });

    it('should find element with role attribute', () => {
      const div = document.createElement('div');
      div.className = 'ProseMirror';
      div.setAttribute('role', 'textbox');
      div.setAttribute('contenteditable', 'true');
      container.appendChild(div);

      const found = findTextInputElement('.ProseMirror[role="textbox"]');
      expect(found).toBe(div);
    });
  });

  describe('injectTextIntoElement', () => {
    it('should inject text into a textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = '';
      document.body.appendChild(textarea);

      const result = injectTextIntoElement(textarea, 'Hello world');
      expect(result).toBe(true);
      expect(textarea.value).toBe('Hello world');

      textarea.remove();
    });

    it('should inject text into contenteditable element', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      div.textContent = '';
      document.body.appendChild(div);

      const result = injectTextIntoElement(div, 'Test content');
      expect(result).toBe(true);
      expect(div.textContent).toBe('Test content');

      div.remove();
    });

    it('should append to existing content in textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Existing text\n';
      document.body.appendChild(textarea);

      const result = injectTextIntoElement(textarea, 'New text');
      expect(result).toBe(true);
      expect(textarea.value).toBe('Existing text\nNew text');

      textarea.remove();
    });

    it('should append to existing content in contenteditable', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      div.textContent = 'Existing';
      document.body.appendChild(div);

      const result = injectTextIntoElement(div, ' Added');
      expect(result).toBe(true);
      expect(div.textContent).toBe('Existing Added');

      div.remove();
    });

    it('should return false for null element', () => {
      const result = injectTextIntoElement(null, 'text');
      expect(result).toBe(false);
    });

    it('should return false for empty text', () => {
      const textarea = document.createElement('textarea');
      const result = injectTextIntoElement(textarea, '');
      expect(result).toBe(false);
    });

    it('should trigger input event on textarea', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      let inputFired = false;
      textarea.addEventListener('input', () => {
        inputFired = true;
      });

      injectTextIntoElement(textarea, 'Test');
      expect(inputFired).toBe(true);

      textarea.remove();
    });

    it('should trigger input event on contenteditable', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);

      let inputFired = false;
      div.addEventListener('input', () => {
        inputFired = true;
      });

      injectTextIntoElement(div, 'Test');
      expect(inputFired).toBe(true);

      div.remove();
    });
  });
});
