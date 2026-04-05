import {
  Box, Flex, VStack, Text, Icon, Divider, Avatar, Badge,
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  useDisclosure, IconButton, useBreakpointValue
} from '@chakra-ui/react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { UserContext } from '../context/UserContext'
import FursaLogo from './FursaLogo'
import {
  FiGrid, FiUsers, FiAlertTriangle, FiDollarSign,
  FiLogOut, FiShield, FiBriefcase, FiBarChart2, FiMenu, FiMessageCircle
} from 'react-icons/fi'

const NavItem = ({ icon, label, to, onClose }) => (
  <NavLink to={to} end style={{ width: '100%' }} onClick={onClose}>
    {({ isActive }) => (
      <Flex
        align="center" gap={3} px={4} py={2.5} borderRadius="xl" cursor="pointer"
        bg={isActive ? '#FF6B35' : 'transparent'}
        color={isActive ? 'white' : '#8899AA'}
        _hover={{ bg: isActive ? '#e55a25' : 'rgba(255,107,53,0.08)', color: isActive ? 'white' : '#FF6B35' }}
        transition="all 0.18s"
      >
        <Icon as={icon} boxSize={4.5} />
        <Text fontSize="sm" fontWeight={isActive ? '600' : '400'}>{label}</Text>
      </Flex>
    )}
  </NavLink>
)

// Sidebar content extracted so it can be used in both desktop & drawer
function SidebarContent({ user, onClose, onLogout }) {
  return (
    <Flex direction="column" h="100%" bg="#0F1E30">
      <Flex justify="center" pt={6} mb={2}>
        <FursaLogo size="sm" variant="dark" />
      </Flex>
      <Flex justify="center" mb={8}>
        <Badge bg="rgba(255,107,53,0.15)" color="#FF6B35" fontSize="xs" px={2} py={0.5} borderRadius="md" fontWeight="700">
          ADMIN PANEL
        </Badge>
      </Flex>

      <Text color="#4A6080" fontSize="xs" fontWeight="700" px={4} mb={2} letterSpacing="wider">
        OVERVIEW
      </Text>
      <VStack spacing={1} align="stretch" mb={4} px={3}>
        <NavItem icon={FiGrid}      label="Dashboard / الرئيسية"  to="/admin"            onClose={onClose} />
        <NavItem icon={FiBarChart2} label="Analytics / التحليلات" to="/admin/analytics"  onClose={onClose} />
      </VStack>

      <Text color="#4A6080" fontSize="xs" fontWeight="700" px={4} mb={2} letterSpacing="wider">
        MANAGEMENT
      </Text>
      <VStack spacing={1} align="stretch" mb={4} px={3}>
        <NavItem icon={FiUsers}         label="Users / المستخدمون"       to="/admin/users"         onClose={onClose} />
        <NavItem icon={FiMessageCircle} label="Conversations / المحادثات" to="/admin/conversations" onClose={onClose} />
        <NavItem icon={FiBriefcase}     label="Projects / المشاريع"      to="/admin/projects"      onClose={onClose} />
        <NavItem icon={FiAlertTriangle} label="Disputes / النزاعات"      to="/admin/disputes"      onClose={onClose} />
        <NavItem icon={FiDollarSign}    label="Transactions / المعاملات" to="/admin/transactions"  onClose={onClose} />
      </VStack>

      <Box flex={1} />
      <Divider borderColor="#1E3555" mb={4} />

      <Flex align="center" gap={3} px={3} mb={3}>
        <Avatar size="sm" name={user?.username} bg="#FF6B35" color="white" />
        <Box overflow="hidden">
          <Text fontSize="sm" color="white" fontWeight="600" noOfLines={1}>{user?.username}</Text>
          <Flex align="center" gap={1}>
            <Icon as={FiShield} color="#FF6B35" boxSize={3} />
            <Text fontSize="xs" color="#FF6B35" fontWeight="600">Administrator</Text>
          </Flex>
        </Box>
      </Flex>

      <Flex
        align="center" gap={3} px={4} py={2.5} mx={3} mb={6} borderRadius="xl" cursor="pointer"
        color="#8899AA" _hover={{ bg: 'rgba(255,107,53,0.08)', color: '#FF6B35' }}
        onClick={onLogout} transition="all 0.18s"
      >
        <Icon as={FiLogOut} boxSize={4.5} />
        <Text fontSize="sm">Logout / خروج</Text>
      </Flex>
    </Flex>
  )
}

export default function AdminLayout() {
  const { user, logout } = useContext(UserContext)
  const navigate = useNavigate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const isMobile = useBreakpointValue({ base: true, lg: false })

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch {}
    logout()
    navigate('/login')
  }

  return (
    <Flex h="100vh" w="100vw" overflow="hidden" bg="#152438">

      {/* Desktop Sidebar — hidden on mobile */}
      {!isMobile && (
        <Box w="260px" borderRight="1px solid #1E3555" flexShrink={0}>
          <SidebarContent user={user} onLogout={handleLogout} />
        </Box>
      )}

      {/* Mobile Sidebar Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay bg="rgba(0,0,0,0.7)" />
        <DrawerContent bg="#0F1E30" maxW="260px" p={0}>
          <DrawerCloseButton color="#8899AA" top={4} right={3} zIndex={10} />
          <SidebarContent user={user} onClose={onClose} onLogout={handleLogout} />
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Flex flex={1} direction="column" overflow="hidden" minW={0}>

        {/* Top Bar */}
        <Flex
          h="64px" bg="#0F1E30" borderBottom="1px solid #1E3555"
          px={{ base: 4, md: 6 }} align="center" justify="space-between" flexShrink={0}
        >
          <Flex align="center" gap={2}>
            {/* Hamburger — mobile only */}
            {isMobile && (
              <IconButton
                icon={<Icon as={FiMenu} />}
                variant="ghost" color="#8899AA"
                _hover={{ color: 'white' }}
                onClick={onOpen}
                aria-label="Open menu"
                mr={1}
              />
            )}
            <Icon as={FiShield} color="#FF6B35" boxSize={5} />
            <Text color="white" fontWeight="700" fontSize={{ base: 'xs', md: 'sm' }}>
              Admin Control Panel
            </Text>
            <Text color="#4A6080" fontSize="sm" display={{ base: 'none', md: 'block' }}>
              / لوحة تحكم المشرف
            </Text>
          </Flex>
          <Text color="#8899AA" fontSize={{ base: 'xs', md: 'sm' }}>
            <Text as="span" display={{ base: 'none', sm: 'inline' }}>Logged in as </Text>
            <Text as="span" color="#FF6B35" fontWeight="700">{user?.username}</Text>
          </Text>
        </Flex>

        {/* Page Content */}
        <Box flex={1} overflowY="auto" p={{ base: 4, md: 7 }} bg="#152438">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
