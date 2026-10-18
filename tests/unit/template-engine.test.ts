import test from 'node:test';
import assert from 'node:assert';
import { TemplateEngine } from '../../packages/mail-core/src/templates/engine.ts';

test('TemplateEngine - Variable substitution and escaping', () => {
  const template = 'Bonjour {{name}}, votre code est {{code}}.';
  const variables = { name: '<Jean>', code: 123456 };

  const result = TemplateEngine.render(template, variables);

  // Vérifie que les chevrons <Jean> sont échappés en &lt;Jean&gt; pour éviter les failles XSS
  assert.strictEqual(result.rendered, 'Bonjour &lt;Jean&gt;, votre code est 123456.');
  assert.strictEqual(result.missingVariables.length, 0);
});

test('TemplateEngine - Nested variables', () => {
  const template = 'Bienvenue {{user.profile.firstName}} {{user.profile.lastName}}';
  const variables = {
    user: {
      profile: {
        firstName: 'Oussamma',
        lastName: 'Ben Hassine',
      },
    },
  };

  const result = TemplateEngine.render(template, variables);
  assert.strictEqual(result.rendered, 'Bienvenue Oussamma Ben Hassine');
});

test('TemplateEngine - Conditional blocks {{#if}} and {{#unless}}', () => {
  const template = '{{#if isPremium}}Membre Premium{{/if}}{{#unless isPremium}}Membre Standard{{/unless}}';

  const res1 = TemplateEngine.render(template, { isPremium: true });
  assert.strictEqual(res1.rendered, 'Membre Premium');

  const res2 = TemplateEngine.render(template, { isPremium: false });
  assert.strictEqual(res2.rendered, 'Membre Standard');
});

test('TemplateEngine - Loop blocks {{#each}}', () => {
  const template = 'Vos applications : {{#each apps}}[{{this}}] {{/each}}';
  const variables = { apps: ['Drive', 'Messenger', 'Mail'] };

  const result = TemplateEngine.render(template, variables);
  assert.strictEqual(result.rendered, 'Vos applications : [Drive] [Messenger] [Mail] ');
});

test('TemplateEngine - Missing variables detection', () => {
  const template = 'Bonjour {{prenom}}, voici votre {{produit}}';
  const result = TemplateEngine.render(template, { prenom: 'Oussamma' });

  assert.strictEqual(result.rendered, 'Bonjour Oussamma, voici votre ');
  assert.deepStrictEqual(result.missingVariables, ['produit']);
});
