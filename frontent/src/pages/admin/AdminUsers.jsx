import {
  Box, Flex, Text, Icon, Input, Button, Avatar, Badge,
  HStack, VStack, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Select, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure
} from '@chakra-ui/react'
import { FiSearch, FiUsers, FiUserX, FiUserCheck, FiEye, FiShield } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import axios from 'axios'

const roleBadge = { admin: ['purple', '#9F7AEA'], freelancer: ['#4299E1', 'rgba(66,153,225,0.15)'], client: ['#48BB78', 'rgba(72,187,120,0.15)'] }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/users', { withCredentials: true })
      setUsers(data)
    } catch {
      toast({ title: 'Failed to load users', status: 'error', duration: 3000 })
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleBan = async (id, isBanned) => {
    try {
      await axios.put(`/api/admin/ban/${id}`, {}, { withCredentials: true })
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: !isBanned } : u))
      toast({ title: isBanned ? 'User unbanned' : 'User banned', status: 'success', duration: 2000 })
    } catch {
      toast({ title: 'Action failed', status: 'error', duration: 3000 })
    }
  }

  const openDetail = (user) => { setSelected(user); onOpen() }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const counts = {
    all: users.length,
    client: users.filter(u => u.role === 'client').length,
    freelancer: users.filter(u => u.role === 'freelancer').length,
    banned: users.filter(u => u.isBanned).length,
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">User Management</Text>
          <Text color="#8899AA" fontSize="sm">إدارة المستخدمين</Text>
        </Box>
      </Flex>

      {/* Summary Cards */}
      <Flex gap={3} mb={6} flexWrap="wrap">
        {[
          { label: 'Total Users', value: counts.all, color: '#4299E1', icon: FiUsers },
          { label: 'Clients', value: counts.client, color: '#48BB78', icon: FiUserCheck },
          { label: 'Freelancers', value: counts.freelancer, color: '#9F7AEA', icon: FiUserCheck },
          { label: 'Banned', value: counts.banned, color: '#FC8181', icon: FiUserX },
        ].map(c => (
          <Flex key={c.label} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={4}
            align="center" gap={3} flex="1" minW="140px">
            <Box bg={`${c.color}18`} p={2.5} borderRadius="lg">
              <Icon as={c.icon} color={c.color} boxSize={5} />
            </Box>
            <Box>
              <Text color="#8899AA" fontSize="xs">{c.label}</Text>
              <Text color="white" fontWeight="700" fontSize="xl">{c.value}</Text>
            </Box>
          </Flex>
        ))}
      </Flex>

      {/* Filters */}
      <Flex gap={3} mb={5}>
        <Flex flex={1} align="center" bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" px={4}
          _focusWithin={{ borderColor: '#FF6B35' }} transition="all 0.2s">
          <Icon as={FiSearch} color="#8899AA" mr={3} />
          <Input
            variant="unstyled" color="white" placeholder="Search by name or email..."
            _placeholder={{ color: '#4A6080' }} value={search}
            onChange={e => setSearch(e.target.value)} py={3}
          />
        </Flex>
        <Select
          w="160px" bg="#1A2E4A" border="1px solid #2A4060" color="#8899AA"
          borderRadius="xl" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          _focus={{ borderColor: '#FF6B35' }}
        >
          <option value="" style={{ background: '#1A2E4A' }}>All Roles</option>
          <option value="client" style={{ background: '#1A2E4A' }}>Client</option>
          <option value="freelancer" style={{ background: '#1A2E4A' }}>Freelancer</option>
          <option value="admin" style={{ background: '#1A2E4A' }}>Admin</option>
        </Select>
      </Flex>

      {/* Table */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" overflow="hidden">
        {loading ? (
          <Flex justify="center" py={16}><Spinner color="#FF6B35" size="lg" /></Flex>
        ) : (
          <Box overflowX="auto">
          <Table variant="unstyled" size="sm" minW="700px">
            <Thead>
              <Tr bg="#152438">
                {['User', 'Role', 'Status', 'Rating', 'Projects', 'Joined', 'Actions'].map(h => (
                  <Th key={h} color="#8899AA" fontSize="xs" py={4} borderBottom="1px solid #2A4060"
                    letterSpacing="wider">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={7} textAlign="center" py={12} color="#8899AA">No users found</Td></Tr>
              ) : filtered.map(u => (
                <Tr key={u._id} _hover={{ bg: '#152438' }} transition="all 0.15s">
                  <Td borderBottom="1px solid #1E3555" py={3.5}>
                    <HStack spacing={3}>
                      <Avatar size="sm" name={u.username} src={u.profilePic} bg="#FF6B35" color="white" />
                      <VStack align="start" spacing={0}>
                        <Text color="white" fontSize="sm" fontWeight="600">{u.username}</Text>
                        <Text color="#8899AA" fontSize="xs">{u.email}</Text>
                      </VStack>
                    </HStack>
                  </Td>
                  <Td borderBottom="1px solid #1E3555">
                    <Badge px={2} py={0.5} borderRadius="lg" fontSize="xs"
                      bg={roleBadge[u.role]?.[1] || 'gray'}
                      color={roleBadge[u.role]?.[0] || 'white'}>
                      {u.role}
                    </Badge>
                  </Td>
                  <Td borderBottom="1px solid #1E3555">
                    <Badge px={2} py={0.5} borderRadius="lg" fontSize="xs"
                      bg={u.isBanned ? 'rgba(252,129,129,0.15)' : 'rgba(72,187,120,0.15)'}
                      color={u.isBanned ? '#FC8181' : '#48BB78'}>
                      {u.isBanned ? 'Banned' : 'Active'}
                    </Badge>
                  </Td>
                  <Td borderBottom="1px solid #1E3555">
                    <Text color="#FF6B35" fontSize="sm" fontWeight="600">
                      ★ {u.rating?.toFixed(1) || '0.0'}
                    </Text>
                  </Td>
                  <Td borderBottom="1px solid #1E3555">
                    <Text color="#8899AA" fontSize="sm">{u.totalProjects || 0}</Text>
                  </Td>
                  <Td borderBottom="1px solid #1E3555">
                    <Text color="#8899AA" fontSize="xs">{new Date(u.createdAt).toLocaleDateString()}</Text>
                  </Td>
                  <Td borderBottom="1px solid #1E3555">
                    <HStack spacing={2}>
                      <Button size="xs" variant="ghost" color="#8899AA" _hover={{ color: '#4299E1' }}
                        leftIcon={<Icon as={FiEye} />} onClick={() => openDetail(u)}>
                        View
                      </Button>
                      {u.role !== 'admin' && (
                        <Button size="xs" variant="ghost"
                          color={u.isBanned ? '#48BB78' : '#FC8181'}
                          _hover={{ bg: u.isBanned ? 'rgba(72,187,120,0.1)' : 'rgba(252,129,129,0.1)' }}
                          leftIcon={<Icon as={u.isBanned ? FiUserCheck : FiUserX} />}
                          onClick={() => handleBan(u._id, u.isBanned)}>
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </Button>
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          </Box>
        )}
      </Box>

      {/* User Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay bg="rgba(0,0,0,0.7)" />
        <ModalContent bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl">
          <ModalHeader color="white">User Details / تفاصيل المستخدم</ModalHeader>
          <ModalCloseButton color="#8899AA" />
          <ModalBody pb={6}>
            {selected && (
              <VStack spacing={4} align="stretch">
                <Flex align="center" gap={4}>
                  <Avatar size="lg" name={selected.username} src={selected.profilePic} bg="#FF6B35" color="white" />
                  <Box>
                    <Text color="white" fontWeight="700" fontSize="lg">{selected.username}</Text>
                    <Text color="#8899AA" fontSize="sm">{selected.email}</Text>
                    <Badge mt={1} px={2} borderRadius="lg" fontSize="xs"
                      bg={roleBadge[selected.role]?.[1]} color={roleBadge[selected.role]?.[0]}>
                      {selected.role}
                    </Badge>
                  </Box>
                </Flex>
                <Box bg="#152438" borderRadius="xl" p={4}>
                  {[
                    ['Bio', selected.bio || 'No bio'],
                    ['Country', selected.country || 'N/A'],
                    ['Rating', `★ ${selected.rating?.toFixed(1) || '0.0'}`],
                    ['Total Projects', selected.totalProjects || 0],
                    ['Total Earned', `$${selected.totalEarned || 0}`],
                    ['Joined', new Date(selected.createdAt).toLocaleDateString()],
                  ].map(([label, val]) => (
                    <Flex key={label} justify="space-between" py={2} borderBottom="1px solid #2A4060">
                      <Text color="#8899AA" fontSize="sm">{label}</Text>
                      <Text color="white" fontSize="sm" fontWeight="600">{val}</Text>
                    </Flex>
                  ))}
                </Box>
                {selected.skills?.length > 0 && (
                  <Box>
                    <Text color="#8899AA" fontSize="xs" mb={2}>Skills</Text>
                    <Flex gap={2} flexWrap="wrap">
                      {selected.skills.map(s => (
                        <Badge key={s} bg="#152438" color="#8899AA" borderRadius="md" px={2}>{s}</Badge>
                      ))}
                    </Flex>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            {selected && selected.role !== 'admin' && (
              <Button
                bg={selected.isBanned ? '#48BB78' : '#FC8181'} color="white"
                onClick={() => { handleBan(selected._id, selected.isBanned); onClose() }}
                borderRadius="xl" size="sm">
                {selected.isBanned ? 'Unban User' : 'Ban User'}
              </Button>
            )}
            <Button variant="ghost" color="#8899AA" onClick={onClose} borderRadius="xl" size="sm">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
