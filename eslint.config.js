// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    // types.ts é gerado de openapi.yaml por `npm run sync:api-types`. Lintar
    // código gerado só produz ruído: a correção seria desfeita na próxima
    // sincronia, e o estilo dele é responsabilidade do gerador.
    ignores: ['dist/**', '.angular/**', 'src/app/core/api/types.ts'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'fs', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'fs', style: 'kebab-case' },
      ],

      // OnPush em todo componente: o projeto depende de signals, e detecção
      // default desperdiça ciclos sem trazer nada em troca.
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',

      // Os decoradores foram substituídos pelas funções input()/output().
      '@angular-eslint/prefer-signals': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowHigherOrderFunctions: true },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // Acessibilidade não é aviso neste projeto: o produto precisa cumprir
      // WCAG AA, então violação de template quebra o lint.
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
    },
  },
);
