import { Box, VStack, Text, Icon, Flex, Divider, Avatar } from '@chakra-ui/react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { UserContext } from '../context/UserContext'
import { FiHome, FiPlusSquare, FiMessageSquare, FiDollarSign, FiUser, FiLogOut, FiShield, FiBriefcase } from 'react-icons/fi'
import FursaLogo from './FursaLogo'

const NavItem = ({ icon, label, to }) => (
  <NavLink to={to} style={{ width: '100%' }}>
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

export default function Sidebar() {
  const { user, logout } = useContext(UserContext)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch {}
    logout()
    navigate('/login')
  }

  return (
    <Box
      w="240px" bg="#1A2E4A" borderRight="1px solid #2A4060"
      py={6} px={3} flexShrink={0}
      display="flex" flexDirection="column" minH="100vh"
    >
      {/* Logo */}
      <Box px={3} mb={8}>
        <FursaLogo size="sm" variant="dark" />
      </Box>

      {/* Nav Items */}
      <VStack spacing={1} align="stretch" flex={1}>
        <NavItem icon={FiHome}         label="Home / الرئيسية"       to="/" />
        <NavItem icon={FiBriefcase}    label="Projects / المشاريع"    to="/projects" />
        {/* /projects mirrors / but keeps the nav item active separately */}
        {user?.role === 'client' &&
          <NavItem icon={FiPlusSquare} label="Post Project / نشر مشروع" to="/post-project" />
        }
        <NavItem icon={FiMessageSquare} label="Messages / الرسائل"   to="/chat" />
        <NavItem icon={FiDollarSign}   label="Wallet / المحفظة"       to="/wallet" />
        <NavItem icon={FiUser}         label="Profile / الملف"        to={`/profile/${user?._id}`} />
        {user?.role === 'admin' &&
          <NavItem icon={FiShield}     label="Admin / الإدارة"        to="/admin" />
        }
      </VStack>

      {/* Bottom: user card + logout */}
      <Box mt={4}>
        <Divider borderColor="#2A4060" mb={4} />
        <Flex align="center" gap={3} px={3} mb={3}>
          <Avatar size="sm" name={user?.username} bg="#FF6B35" color="white" />
          <Box overflow="hidden">
            <Text fontSize="sm" color="white" fontWeight="600" noOfLines={1}>{user?.username}</Text>
            <Text fontSize="xs" color="#8899AA" noOfLines={1} textTransform="capitalize">{user?.role}</Text>
          </Box>
        </Flex>
        <Flex
          align="center" gap={3} px={4} py={2.5} borderRadius="xl" cursor="pointer"
          color="#8899AA" _hover={{ bg: 'rgba(255,107,53,0.08)', color: '#FF6B35' }}
          onClick={handleLogout} transition="all 0.18s"
        >
          <Icon as={FiLogOut} boxSize={4.5} />
          <Text fontSize="sm">Logout / خروج</Text>
        </Flex>
      </Box>
    </Box>
  )
}
