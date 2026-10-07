export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
      secondary: 'sky',
      success: 'emerald',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'slate',
    },
    card: {
      slots: {
        root: 'rounded-xl',
      },
    },
    button: {
      slots: {
        base: 'cursor-pointer',
      },
    },
  },
})
