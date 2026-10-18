import test from 'node:test';
import assert from 'node:assert';
import { EmailSanitizer } from '../../packages/mail-core/src/security/sanitizer.ts';

test('EmailSanitizer - Strip script tags and inline javascript', () => {
  const dirty = '<div>Bonjour<script>alert("hack")</script><a href="javascript:alert(1)">Cliquez ici</a></div>';
  const { cleanHtml } = EmailSanitizer.sanitize(dirty);

  assert.ok(!cleanHtml.includes('<script>'));
  assert.ok(!cleanHtml.includes('alert("hack")'));
  assert.ok(!cleanHtml.includes('javascript:'));
  assert.ok(cleanHtml.includes('Bonjour'));
});

test('EmailSanitizer - Strip event handlers (onload, onerror, onclick)', () => {
  const dirty = '<img src="valid.jpg" onerror="alert(document.cookie)" onload="steal()"><p onclick="bad()">Texte</p>';
  const { cleanHtml } = EmailSanitizer.sanitize(dirty);

  assert.ok(!cleanHtml.includes('onerror'));
  assert.ok(!cleanHtml.includes('onload'));
  assert.ok(!cleanHtml.includes('onclick'));
});

test('EmailSanitizer - Block remote tracking pixels and images by default', () => {
  const dirty = '<p>Contenu</p><img src="https://tracker.spy.com/pixel.png" width="1" height="1">';
  const { cleanHtml, blockedImageCount } = EmailSanitizer.sanitize(dirty, { blockRemoteImages: true });

  assert.strictEqual(blockedImageCount, 1);
  assert.ok(!cleanHtml.includes('https://tracker.spy.com/pixel.png'));
  assert.ok(cleanHtml.includes('blocked-remote-image'));
});

test('EmailSanitizer - Links forced with target=_blank and rel=noopener', () => {
  const dirty = '<a href="https://oussamma.tn">Portail</a>';
  const { cleanHtml } = EmailSanitizer.sanitize(dirty);

  assert.ok(cleanHtml.includes('target="_blank"'));
  assert.ok(cleanHtml.includes('rel="noopener noreferrer"'));
});
