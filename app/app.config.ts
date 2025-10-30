export default defineAppConfig({
  // https://ui3.nuxt.dev/getting-started/theme#design-system
  ui: {
    colors: {
      'primary': 'everglade',
      'neutral': 'stone',
      'secondary': 'harvest-gold',
      'status-normal': 'green',
      'status-info': 'gray',
      'status-warning': 'blue',
      'status-minor': 'yellow',
      'status-major': 'orange',
      'status-critical': 'red',
    },
    button: {
      defaultVariants: {
        // Set default button color to neutral
        // color: 'neutral'
      },
    },
  },
})
