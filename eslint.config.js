// @ts-check
import eslint from '@eslint/js';
import eslintPluginVue from 'eslint-plugin-vue';
import eslintVueParser from 'vue-eslint-parser';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';
import eslintPluginVuetify from 'eslint-plugin-vuetify';


export default typescriptEslint.config(
  { ignores: ['**/dist'] },


  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      // ...eslintPluginVue.configs['flat/essential'], // handle Vue specific rules in a separate block
    ],
    
    
    languageOptions: {
      parser: typescriptEslint.parser, 
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: globals.browser,
    },
    
    // keep rules from vue-ds-template
    rules: {
      "indent": ["error", 2],
      "@typescript-eslint/naming-convention": [
        "error", {
          selector: ["variable", "memberLike", "function"],
          format: ["camelCase"],
          leadingUnderscore: "allow"
        },
        {
          selector: ["variable"],
          modifiers: ["global", "const"],
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow"
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
          leadingUnderscore: "allow"
        },
        {
          selector: [
            "classProperty",
            "objectLiteralProperty",
            "typeProperty",
            "classMethod",
            "objectLiteralMethod",
            "typeMethod",
            "accessor",
            "enumMember"
          ],
          format: null,
          modifiers: ["requiresQuotes"]
        }
      ],
      "@typescript-eslint/no-unused-vars": [
        "error", {
          "args": "all",
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "@/semi": "error",
      "vue/multi-word-component-names": "off"
    },
    
  },
  
  // ESLint configuration for Vue3
  {
    files: ['**/*.vue'],
    // @ts-expect-error: Vuetify
    extends: [
      ...eslintPluginVue.configs['flat/essential'],
      ...eslintPluginVuetify.configs['flat/base'],
      
    ],
    languageOptions: {
      parser: eslintVueParser,
      parserOptions: {
        parser: {
          ts: typescriptEslint.parser, 
        },
        extraFileExtensions: ['.vue'],
      },
    },
    
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  }

);



