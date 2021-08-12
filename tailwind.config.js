module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#fff',
      black: '#000',

      teal: {
        DEFAULT: '#2ACFCF',
        100: '#D6EBEB',
        300: '#88CCCC',
        500: '#2ACFCF',
        700: '#33A7A7',
        900: '#1B8383',
      },

      purple: {
        DEFAULT: '#894893',
        100: '#D2BFD5',
        300: '#AC71B5',
        500: '#894893',
        700: '#57355E',
        900: '#341D39',
      },

      red: {
        DEFAULT: '#DD7373',
        
        100: '#F7DEDE',
        300: '#E79C9C',
        500: '#DD7373',
        700: '#CF3A3A',
      },

      yellow: {
        DEFAULT: '#EAD94C',
        
        100: '#F8F3DD',
        300: '#F0E57F',
        500: '#EAD94C',
        700: '#DBC81A',
      },

      blue: {
        DEFAULT: '#5BC0EB',
        
        100: '#DAF1FB',
        300: '#92D5F2',
        500: '#5BC0EB',
        700: '#18A2DC',
        900: '#1279A5',
      },

      gray: {
        DEFAULT: '#83898C',

        100: '#EFEFEF',
        300: '#C1C2C4',
        500: '#83898C',
        700: '#6C6C6C',
        900: '#4A4A4A',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
