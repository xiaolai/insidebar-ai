// Text injection handler for DeepSeek
import { setupTextInjectionListener } from './text-injection-handler.js';

// DeepSeek uses textarea with .ds-scroll-area class
setupTextInjectionListener('textarea.ds-scroll-area', 'DeepSeek');
