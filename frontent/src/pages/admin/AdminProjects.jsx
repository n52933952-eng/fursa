import {
  Box, Flex, Text, Icon, Input, Badge, HStack, VStack,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Select, SimpleGrid, Avatar
} from '@chakra-ui/react'
import { FiSearch, FiBriefcase, FiClock, FiDollarSign, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useEffect, useState, useContext } from 'react'
import { SocketContext } from '../../context/SocketContext'
import axios from 'axios'

const statusColor = {
  open:       { bg: 'rgba(66,153,225,0.15)',  color: '#4299E1' },
  inProgress: { bg: 'rgba(237,137,54,0.15)',  color: '#ED8936' },
  completed:  { bg: 'rgba(72,187,120,0.15)',  color: '#48BB78' },
  cancelled:  { bg: 'rgba(252,129,129,0.15)', color: '#FC8181' },
}

export default function AdminProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { socket } = useContext(SocketContext)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await axios.get('/api/project', { withCredentials: true })
        setProjects(data)
      } catch {}
      setLoading(false)
    }
    fetchProjects()
  }, [])

  // Real-time: new project created
  useEffect(() => {
    if (!socket) return
    const handle = ({ type, data }) => {
      if (type === 'newProject') {
        setProjects(prev => [data, ...prev])
      }
    }
    socket.on('adminUpdate', handle)
    return () => socket.off('adminUpdate', handle)
  }, [socket])

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    total: projects.length,
    open: projects.filter(p => p.status === 'open').length,
    inProgress: projects.filter(p => p.status === 'inProgress').length,
    completed: projects.filter(p => p.status === 'completed').length,
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">Projects Monitor</Text>
          <Text color="#8899AA" fontSize="sm">مراقبة المشاريع</Text>
        </Box>
      </Flex>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={6}>
        {[
          { label: 'Total Projects', value: counts.total, color: '#9F7AEA', icon: FiBriefcase },
          { label: 'Open', value: counts.open, color: '#4299E1', icon: FiAlertCircle },
          { label: 'In Progress', value: counts.inProgress, color: '#ED8936', icon: FiClock },
          { label: 'Completed', value: counts.completed, color: '#48BB78', icon: FiCheckCircle },
        ].map(c => (
          <Flex key={c.label} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl"
            p={4} align="center" gap={3}>
            <Box bg={`${c.color}18`} p={2.5} borderRadius="lg">
              <Icon as={c.icon} color={c.color} boxSize={5} />
            </Box>
            <Box>
              <Text color="#8899AA" fontSize="xs">{c.label}</Text>
              <Text color="white" fontWeight="700" fontSize="xl">{c.value}</Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>

      {/* Filters */}
      <Flex gap={3} mb={5}>
        <Flex flex={1} align="center" bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" px={4}
          _focusWithin={{ borderColor: '#FF6B35' }} transition="all 0.2s">
          <Icon as={FiSearch} color="#8899AA" mr={3} />
          <Input variant="unstyled" color="white" placeholder="Search projects..."
            _placeholder={{ color: '#4A6080' }} value={search}
            onChange={e => setSearch(e.target.value)} py={3} />
        </Flex>
        <Select w="160px" bg="#1A2E4A" border="1px solid #2A4060" color="#8899AA"
          borderRadius="xl" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          _focus={{ borderColor: '#FF6B35' }}>
          <option value="" style={{ background: '#1A2E4A' }}>All Status</option>
          <option value="open" style={{ background: '#1A2E4A' }}>Open</option>
          <option value="inProgress" style={{ background: '#1A2E4A' }}>In Progress</option>
          <option value="completed" style={{ background: '#1A2E4A' }}>Completed</option>
          <option value="cancelled" style={{ background: '#1A2E4A' }}>Cancelled</option>
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
                {['Project', 'Client', 'Category', 'Budget', 'Status', 'Proposals', 'Deadline'].map(h => (
                  <Th key={h} color="#8899AA" fontSize="xs" py={4} borderBottom="1px solid #2A4060" letterSpacing="wider">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={7} textAlign="center" py={12} color="#8899AA">No projects found</Td></Tr>
              ) : filtered.map(p => {
                const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / 86400000)
                const sc = statusColor[p.status] || statusColor.open
                return (
                  <Tr key={p._id} _hover={{ bg: '#152438' }} transition="all 0.15s">
                    <Td borderBottom="1px solid #1E3555" py={3.5} maxW="200px">
                      <Text color="white" fontSize="sm" fontWeight="600" noOfLines={1}>{p.title}</Text>
                      <Text color="#8899AA" fontSize="xs" noOfLines={1}>{p.description}</Text>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <HStack spacing={2}>
                        <Avatar size="xs" name={p.clientId?.username} bg="#FF6B35" color="white" />
                        <Text color="#8899AA" fontSize="xs">{p.clientId?.username || 'N/A'}</Text>
                      </HStack>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Badge bg="rgba(159,122,234,0.15)" color="#9F7AEA" borderRadius="md" fontSize="xs" px={2}>
                        {p.category}
                      </Badge>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <HStack spacing={1}>
                        <Icon as={FiDollarSign} color="#FF6B35" boxSize={3} />
                        <Text color="#FF6B35" fontWeight="700" fontSize="sm">{p.budget}</Text>
                      </HStack>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Badge px={2} py={0.5} borderRadius="lg" fontSize="xs" bg={sc.bg} color={sc.color}>
                        {p.status}
                      </Badge>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Text color="#8899AA" fontSize="sm">{p.proposals?.length || 0}</Text>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Text color={daysLeft < 3 ? '#FC8181' : '#8899AA'} fontSize="xs">
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                      </Text>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
          </Box>
        )}
      </Box>
    </Box>
  )
}
