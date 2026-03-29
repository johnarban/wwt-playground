import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

// Translations provided by Vuetify
import { en } from 'vuetify/locale';

// Styles
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';


// Rubin Specific Colors
export const THEME_COLORS = {
  'theme-turquoise': '#00BABC', // on light and dark backgrounds
  'theme-teal': '#058B8C', // on light and dark backgrounds
  'theme-charcoal': '#313333', // on light backgrounds
  'theme-off-white': '#F5F5F5', // on dark backgrounds
  'theme-purple': '#583671',
  'theme-highlight-gold': '#C4A447',
  'theme-gray-1': '#DcE0E3',
  'theme-gray-2': '#6a6E6E',
  'theme-deep-charcoal': "#1F2121",
  'theme-teal-1': '#D9F7F6',
  'theme-teal-2': '#B1F2EF',
  'theme-teal-3': '#009FA1',
  'theme-teal-4': '#12726D',
  'theme-teal-5': '#0C4A47',
  'theme-teal-6': '#062E2C',
  'theme-teal-7': '#021A18',
} as const;

export default createVuetify({
  // Breakpoint thresholds (V4 defaults; V3 values noted in comments)
  display: {
    thresholds: {
      xs: 0,    // unchanged from V3
      sm: 600,  // unchanged from V3
      md: 840,  // was 960
      lg: 1145, // was 1280
      xl: 1545, // was 1920
      xxl: 2138, // was 2560
    },
  },
  // Icon Fonts
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  locale: {
    locale: 'en',
    fallback: 'en',
    messages: { en },
  },
  theme: {
    // See https://rubin.canto.com/g/RubinVisualIdentity/index?viewIndex=0

    defaultTheme: 'rubinA',
    themes: {
      rubinA: {
        dark: true,
        colors: {
          // Core brand colors
          // Lighter button color
          primaryVariant: THEME_COLORS['theme-turquoise'],
          // Darker accent color
          primary: THEME_COLORS['theme-teal'],

          // Surface and backgrounds
          // Main "v-application" background color
          background: THEME_COLORS['theme-deep-charcoal'],
          // Info Drawer background color (set by Vuetify default)
          surface: THEME_COLORS['theme-deep-charcoal'],

          // Thumbnail background color
          info: THEME_COLORS['theme-charcoal'],

          // Thumbnail highlight color
          accent: THEME_COLORS['theme-highlight-gold'],

          // "On-color" colors. These are only used by default on Vuetify components.
          // when you have set the color using color="blah", then the text color
          // will be "on-blah".
          "on-surface": THEME_COLORS['theme-off-white'],
          "on-background": THEME_COLORS['theme-off-white'],
          "on-primary": THEME_COLORS['theme-off-white'],

          // Custom properties
          // Infobox background color
          "surface-variant": THEME_COLORS['theme-deep-charcoal'],
          "on-surface-variant": THEME_COLORS['theme-off-white'],

          ...THEME_COLORS,
        },
      },
      // TODO: This is the same as B right now
      rubinB: {
        dark: true,
        colors: {
          // Core brand colors
          // Button color
          primaryVariant: THEME_COLORS['theme-turquoise'],
          // Accent color
          primary: THEME_COLORS['theme-charcoal'],

          // Surface and backgrounds
          // Main "v-application" background color
          background: THEME_COLORS['theme-deep-charcoal'],
          // Info Drawer background color (set by Vuetify default)
          surface: THEME_COLORS['theme-deep-charcoal'],

          // Thumbnail background color
          info: THEME_COLORS['theme-teal'],

          // Thumbnail highlight color
          accent: THEME_COLORS['theme-highlight-gold'],
          
          // "On-color" colors. These are only used by default on Vuetify components.
          // when you have set the color using color="blah", then the text color
          // will be "on-blah".
          "on-surface": THEME_COLORS['theme-off-white'],
          "on-background": THEME_COLORS['theme-off-white'],
          "on-primary": THEME_COLORS['theme-off-white'],

          // Custom properties
          // Infobox background color
          "surface-variant": THEME_COLORS['theme-deep-charcoal'],
          "on-surface-variant": THEME_COLORS['theme-off-white'],

          ...THEME_COLORS,
        }
      }
    },
  },
});
