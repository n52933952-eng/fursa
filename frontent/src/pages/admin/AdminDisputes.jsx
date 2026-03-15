import {
  Box, Flex, Text, Icon, Badge, HStack, VStack, Avatar,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Button, SimpleGrid,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, Textarea, useToast, Select
} from '@chakra-ui/react'
import { FiAlertTriangle, FiCheckCircle, FiClock, FiMessageSquare, FiEye } from 'react-icons/fi'
import { useEffect, useState, useContext } from 'react'
import { SocketContext } from '../../context/SocketContext'
import axios from 'axios'

const statusColor = {
  open:     { bg: 'rgba(252,129,129,0.15)', color: '#FC8181' },
  reviewing:{ bg: 'rgba(237,137,54,0.15)',  color: '#ED8936' },
  resolved: { bg: 'rgba(72,187,120,0.15)',  color: '#48BB78' },
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [resolution, setResolution] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const { socket } = useContext(SocketContext)

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/admin/disputes', { withCredentials: true })
      setDisputes(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchDisputes() }, [])

  // Real-time: new dispute filed
  useEffect(() => {
    if (!socket) return
    const handle = ({ type, data }) => {
      if (type === 'newDispute') {
        setDisputes(prev => [data, ...prev])
      }
    }
    socket.on('adminUpdate', handle)
    return () => socket.off('adminUpdate', handle)
  }, [socket])

  const handleResolve = async () => {
    if (!resolution.trim()) return
    try {
      await axios.put(`/api/dispute/${selected._id}/resolve`,
        { resolution, winner: 'client' }, { withCredentials: true })
      setDisputes(prev => prev.map(d => d._id === selected._id ? { ...d, status: 'resolved' } : d))
      toast({ title: 'Dispute resolved', status: 'success', duration: 2000 })
      onClose()
      setResolution('')
    } catch {
      toast({ title: 'Failed to resolve', status: 'error', duration: 3000 })
    }
  }

  const openDetail = (dispute) => { setSelected(dispute); onOpen() }

  const filtered = disputes.filter(d => !statusFilter || d.status === statusFilter)

  const counts = {
    open: disputes.filter(d => d.status === 'open').length,
    reviewing: disputes.filter(d => d.status === 'reviewing').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">Dispute Resolution</Text>
          <Text color="#8899AA" fontSize="sm">مركز حل النزاعات</Text>
        </Box>
      </Flex>

      {/* Summary */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        {[
          { label: 'Open Disputes', labelAr: 'مفتوحة', value: counts.open, color: '#FC8181', icon: FiAlertTriangle },
          { label: 'Under Review', labelAr: 'قيد المراجعة', value: counts.reviewing, color: '#ED8936', icon: FiClock },
          { label: 'Resolved', labelAr: 'تم الحل', value: counts.resolved, color: '#48BB78', icon: FiCheckCircle },
        ].map(c => (
          <Flex key={c.label} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={5}
            align="center" gap={4}>
            <Box bg={`${c.color}18`} p={3} borderRadius="xl">
              <Icon as={c.icon} color={c.color} boxSize={6} />
            </Box>
            <Box>
              <Text color="#8899AA" fontSize="xs">{c.label} / {c.labelAr}</Text>
              <Text color="white" fontWeight="800" fontSize="2xl">{c.value}</Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>

      {/* Filter */}
      <Flex justify="flex-end" mb={4}>
        <Select w="160px" bg="#1A2E4A" border="1px solid #2A4060" color="#8899AA"
          borderRadius="xl" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          _focus={{ borderColor: '#FF6B35' }}>
          <option value="" style={{ background: '#1A2E4A' }}>All Status</option>
          <option value="open" style={{ background: '#1A2E4A' }}>Open</option>
          <option value="reviewing" style={{ background: '#1A2E4A' }}>Reviewing</option>
          <option value="resolved" style={{ background: '#1A2E4A' }}>Resolved</option>
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
                {['Project', 'Filed By', 'Against', 'Reason', 'Status', 'Date', 'Action'].map(h => (
                  <Th key={h} color="#8899AA" fontSize="xs" py={4} borderBottom="1px solid #2A4060" letterSpacing="wider">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={16}>
                    <VStack spacing={2}>
                      <Icon as={FiCheckCircle} color="#48BB78" boxSize={10} />
                      <Text color="#48BB78" fontWeight="600">No disputes found!</Text>
                      <Text color="#8899AA" fontSize="sm">لا توجد نزاعات</Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : filtered.map(d => {
                const sc = statusColor[d.status] || statusColor.open
                return (
                  <Tr key={d._id} _hover={{ bg: '#152438' }} transition="all 0.15s">
                    <Td borderBottom="1px solid #1E3555" py={3.5} maxW="160px">
                      <Text color="white" fontSize="sm" fontWeight="600" noOfLines={1}>
                        {d.projectId?.title || 'N/A'}
                      </Text>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <HStack spacing={2}>
                        <Avatar size="xs" name={d.filedBy?.username} bg="#FF6B35" color="white" />
                        <Text color="#8899AA" fontSize="xs">{d.filedBy?.username || 'N/A'}</Text>
                      </HStack>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <HStack spacing={2}>
                        <Avatar size="xs" name={d.against?.username} bg="#4299E1" color="white" />
                        <Text color="#8899AA" fontSize="xs">{d.against?.username || 'N/A'}</Text>
                      </HStack>
                    </Td>
                    <Td borderBottom="1px solid #1E3555" maxW="180px">
                      <Text color="#8899AA" fontSize="xs" noOfLines={2}>{d.reason}</Text>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Badge px={2} py={0.5} borderRadius="lg" fontSize="xs" bg={sc.bg} color={sc.color}>
                        {d.status}
                      </Badge>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Text color="#8899AA" fontSize="xs">{new Date(d.createdAt).toLocaleDateString()}</Text>
                    </Td>
                    <Td borderBottom="1px solid #1E3555">
                      <Button size="xs" bg={d.status === 'resolved' ? 'transparent' : '#FF6B35'}
                        color={d.status === 'resolved' ? '#48BB78' : 'white'}
                        _hover={d.status !== 'resolved' ? { bg: '#e55a25' } : {}}
                        borderRadius="lg" leftIcon={<Icon as={d.status === 'resolved' ? FiCheckCircle : FiEye} boxSize={3} />}
                        onClick={() => d.status !== 'resolved' && openDetail(d)}
                        cursor={d.status === 'resolved' ? 'default' : 'pointer'}>
                        {d.status === 'resolved' ? 'Resolved' : 'Resolve'}
                      </Button>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
          </Box>
        )}
      </Box>

      {/* Resolve Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay bg="rgba(0,0,0,0.7)" />
        <ModalContent bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl">
          <ModalHeader color="white">
            <Flex align="center" gap={2}>
              <Icon as={FiAlertTriangle} color="#FC8181" />
              Resolve Dispute
            </Flex>
          </ModalHeader>
          <ModalCloseButton color="#8899AA" />
          <ModalBody pb={4}>
            {selected && (
              <VStack spacing={4} align="stretch">
                <Box bg="#152438" borderRadius="xl" p={4}>
                  <Text color="#8899AA" fontSize="xs" mb={1}>PROJECT</Text>
                  <Text color="white" fontWeight="600">{selected.projectId?.title}</Text>
                </Box>
                <Flex gap={4}>
                  <Box flex={1} bg="#152438" borderRadius="xl" p={4}>
                    <Text color="#8899AA" fontSize="xs" mb={1}>FILED BY</Text>
                    <HStack>
                      <Avatar size="xs" name={selected.filedBy?.username} bg="#FF6B35" color="white" />
                      <Text color="white" fontSize="sm">{selected.filedBy?.username}</Text>
                    </HStack>
                  </Box>
                  <Box flex={1} bg="#152438" borderRadius="xl" p={4}>
                    <Text color="#8899AA" fontSize="xs" mb={1}>AGAINST</Text>
                    <HStack>
                      <Avatar size="xs" name={selected.against?.username} bg="#4299E1" color="white" />
                      <Text color="white" fontSize="sm">{selected.against?.username}</Text>
                    </HStack>
                  </Box>
                </Flex>
                <Box bg="#152438" borderRadius="xl" p={4}>
                  <Text color="#8899AA" fontSize="xs" mb={1}>REASON</Text>
                  <Text color="white" fontSize="sm">{selected.reason}</Text>
                </Box>
                <Box>
                  <Text color="#8899AA" fontSize="sm" mb={2}>
                    <Icon as={FiMessageSquare} mr={1} />
                    Admin Resolution Note
                  </Text>
                  <Textarea
                    bg="#152438" border="1px solid #2A4060" color="white"
                    _focus={{ borderColor: '#FF6B35' }} borderRadius="xl"
                    placeholder="Write your resolution decision..."
                    value={resolution} onChange={e => setResolution(e.target.value)}
                    rows={4}
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button bg="#48BB78" color="white" _hover={{ bg: '#38A169' }} borderRadius="xl"
              onClick={handleResolve} isDisabled={!resolution.trim()}>
              Mark as Resolved
            </Button>
            <Button variant="ghost" color="#8899AA" onClick={onClose} borderRadius="xl">Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
