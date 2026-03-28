import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

// Translations provided by Vuetify
import { en } from 'vuetify/locale';

// Styles
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

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
    defaultTheme: 'dark',
  },
});
