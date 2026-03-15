import { Box, Flex } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <Flex h="100vh" bg="#1A2E4A">
      <Sidebar />
      <Flex flex={1} direction="column" overflow="hidden">
        <Navbar />
        <Box flex={1} overflowY="auto" p={7} bg="#152438">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
