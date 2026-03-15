import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  colors: {
    brand: {
      primary: '#1A2E4A',
      secondary: '#152438',
      accent: '#FF6B35',
      accentHover: '#e55a25',
      card: '#1E3555',
      border: '#2A4060',
      text: '#E2E8F0',
      muted: '#8899AA',
    }
  },
  styles: {
    global: {
      'html, body, #root': {
        height: '100%',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      },
      body: {
        bg: '#152438',
        color: '#E2E8F0',
      }
    }
  },
  components: {
    Button: {
      variants: {
        solid: {
          bg: '#FF6B35',
          color: 'white',
          _hover: { bg: '#e55a25' }
        }
      }
    }
  }
})

export default theme
