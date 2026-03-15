import { Flex, Box, Text, Icon, Avatar, Badge, HStack, Menu, MenuButton, MenuList, MenuItem, Divider } from '@chakra-ui/react'
import { FiBell, FiGlobe, FiUser, FiLogOut, FiSettings } from 'react-icons/fi'
import { useContext, useState } from 'react'
import { UserContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const { user, notifications, logout } = useContext(UserContext)
  const [lang, setLang] = useState('EN')
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.read).length

  return (
    <Flex
      h="64px" bg="#1A2E4A" borderBottom="1px solid #2A4060"
      px={6} align="center" justify="space-between" flexShrink={0}
    >
      {/* Left: greeting */}
      <Box>
        <Text color="#8899AA" fontSize="sm">
          Welcome back,{' '}
          <Text as="span" color="white" fontWeight="700">{user?.username}</Text>
        </Text>
        <Text fontSize="xs" color="#4A6080" textTransform="capitalize">{user?.role}</Text>
      </Box>

      <HStack spacing={3}>
        {/* Language Toggle */}
        <Flex
          align="center" gap={1.5} px={3} py={1.5} borderRadius="full"
          border="1px solid #2A4060" cursor="pointer"
          onClick={() => setLang(l => l === 'EN' ? 'AR' : 'EN')}
          _hover={{ borderColor: '#FF6B35', color: '#FF6B35' }}
          transition="all 0.2s"
        >
          <Icon as={FiGlobe} color="#8899AA" boxSize={3.5} />
          <Text fontSize="xs" color="#8899AA" fontWeight="600">{lang}</Text>
        </Flex>

        {/* Notifications Bell */}
        <Box
          position="relative" cursor="pointer" p={2} borderRadius="lg"
          _hover={{ bg: 'rgba(255,107,53,0.08)' }}
          onClick={() => navigate('/notifications')}
        >
          <Icon as={FiBell} boxSize={5} color="#8899AA" />
          {unread > 0 && (
            <Badge
              position="absolute" top="4px" right="4px"
              bg="#FF6B35" color="white" borderRadius="full"
              fontSize="9px" minW="15px" h="15px"
              display="flex" alignItems="center" justifyContent="center"
              border="2px solid #1A2E4A"
            >
              {unread}
            </Badge>
          )}
        </Box>

        {/* Profile Menu */}
        <Menu>
          <MenuButton>
            <Avatar
              size="sm" name={user?.username} src={user?.profilePic}
              bg="#FF6B35" color="white" cursor="pointer"
              border="2px solid #2A4060"
              _hover={{ borderColor: '#FF6B35' }}
            />
          </MenuButton>
          <MenuList bg="#1A2E4A" border="1px solid #2A4060" boxShadow="0 8px 32px rgba(0,0,0,0.4)" p={1} minW="180px">
            <Box px={3} py={2} mb={1}>
              <Text color="white" fontWeight="600" fontSize="sm">{user?.username}</Text>
              <Text color="#8899AA" fontSize="xs">{user?.email}</Text>
            </Box>
            <Divider borderColor="#2A4060" mb={1} />
            <MenuItem
              icon={<Icon as={FiUser} />}
              bg="transparent" color="#8899AA"
              _hover={{ bg: 'rgba(255,107,53,0.08)', color: '#FF6B35' }}
              borderRadius="lg" fontSize="sm"
              onClick={() => navigate(`/profile/${user?._id}`)}
            >
              My Profile
            </MenuItem>
            <MenuItem
              icon={<Icon as={FiLogOut} />}
              bg="transparent" color="#8899AA"
              _hover={{ bg: 'rgba(255,107,53,0.08)', color: '#FF6B35' }}
              borderRadius="lg" fontSize="sm"
              onClick={() => { logout(); navigate('/login') }}
            >
              Logout / خروج
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  )
}
