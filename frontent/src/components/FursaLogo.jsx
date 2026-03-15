import { Image, Box } from '@chakra-ui/react'
import logoOrange from '../assets/logo.png'
import logoGrey from '../assets/logo2.png'

/**
 * variant:
 *   'dark'  → silver logo (for dark backgrounds like sidebar, login card)
 *   'light' → orange logo (for light backgrounds)
 */
const sizes = {
  sm: '90px',
  md: '120px',
  lg: '160px',
}

export default function FursaLogo({ size = 'md', variant = 'dark' }) {
  const src = variant === 'light' ? logoOrange : logoGrey

  return (
    <Box w={sizes[size]} flexShrink={0}>
      <Image
        src={src}
        w="100%"
        h="auto"
        objectFit="contain"
        alt="Fursa Logo"
        borderRadius="lg"
      />
    </Box>
  )
}
