import {
  Box, Flex, Text, Icon, Badge, HStack, Avatar,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, SimpleGrid, Select
} from '@chakra-ui/react'
import { FiDollarSign, FiArrowUpRight, FiArrowDownLeft, FiClock, FiTrendingUp, FiActivity } from 'react-icons/fi'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState, useContext, useMemo } from 'react'
import { SocketContext } from '../../context/SocketContext'
import axios from 'axios'

const typeColor = {
  escrow:     { bg: 'rgba(66,153,225,0.15)',  color: '#4299E1',  icon: FiClock },
  release:    { bg: 'rgba(72,187,120,0.15)',  color: '#48BB78',  icon: FiArrowUpRight },
  deposit:    { bg: 'rgba(159,122,234,0.15)', color: '#9F7AEA',  icon: FiArrowDownLeft },
  withdrawal: { bg: 'rgba(252,129,129,0.15)', color: '#FC8181',  icon: FiArrowUpRight },
  refund:     { bg: 'rgba(237,137,54,0.15)',  color: '#ED8936',  icon: FiArrowDownLeft },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="lg" p={3}>
      <Text color="#8899AA" fontSize="xs" mb={1}>{label}</Text>
      {payload.map(p => (
        <Text key={p.name} color="white" fontSize="sm">
          {p.name}: <Text as="span" color={p.name === 'fees' ? '#48BB78' : '#FF6B35'} fontWeight="700">
            ${p.value.toLocaleString()}
          </Text>
        </Text>
      ))}
    </Box>
  )
}

// Build monthly chart data from raw transactions (last 6 months)
function buildMonthlyData(transactions) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  const months = []
  const map = {}

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = monthNames[d.getMonth()]
    months.push({ key, label })
    map[key] = { month: label, volume: 0, fees: 0 }
  }

  transactions.forEach(t => {
    const d = new Date(t.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (map[key]) {
      map[key].volume += t.amount
      if (t.type === 'release') map[key].fees += t.amount * 0.1
    }
  })

  return months.map(m => ({
    month: map[m.key].month,
    volume: Math.round(map[m.key].volume),
    fees:   Math.round(map[m.key].fees),
  }))
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [monthlyData, setMonthlyData]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [typeFilter, setTypeFilter]     = useState('')
  const { socket } = useContext(SocketContext)

  const fetchTransactions = async () => {
    try {
      const { data } = await axios.get('/api/admin/transactions', { withCredentials: true })
      const list = Array.isArray(data) ? data : []
      setTransactions(list)
      setMonthlyData(buildMonthlyData(list))
    } catch {
      setTransactions([])
      setMonthlyData([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchTransactions() }, [])

  // Real-time updates via socket
  useEffect(() => {
    if (!socket) return

    const handle = ({ type, data }) => {
      if (type === 'newTransaction') {
        setTransactions(prev => {
          const next = [data, ...prev]
          setMonthlyData(buildMonthlyData(next))
          return next
        })
      }
    }

    socket.on('adminUpdate', handle)
    return () => socket.off('adminUpdate', handle)
  }, [socket])

  // Computed stats from real data
  const stats = useMemo(() => {
    const totalVolume  = transactions.reduce((s, t) => s + t.amount, 0)
    const totalFees    = transactions.filter(t => t.type === 'release').reduce((s, t) => s + t.amount * 0.1, 0)
    const inEscrow     = transactions.filter(t => t.type === 'escrow').reduce((s, t) => s + t.amount, 0)
    return { totalVolume, totalFees, inEscrow, count: transactions.length }
  }, [transactions])

  const filtered = transactions.filter(t => !typeFilter || t.type === typeFilter)

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">Financial Monitoring</Text>
          <Text color="#8899AA" fontSize="sm">مراقبة المعاملات المالية</Text>
        </Box>
        <Badge bg="rgba(72,187,120,0.15)" color="#48BB78" px={3} py={1} borderRadius="full" fontSize="sm">
          <HStack spacing={1}>
            <Icon as={FiActivity} boxSize={3} />
            <Text>Live</Text>
          </HStack>
        </Badge>
      </Flex>

      {/* Stats — computed from real data */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={6}>
        {[
          { label: 'Total Volume',   labelAr: 'حجم المعاملات',  value: `$${Math.round(stats.totalVolume).toLocaleString()}`,  color: '#4299E1', icon: FiDollarSign },
          { label: 'Platform Fees',  labelAr: 'عمولة المنصة',   value: `$${Math.round(stats.totalFees).toLocaleString()}`,    color: '#48BB78', icon: FiTrendingUp },
          { label: 'In Escrow',      labelAr: 'قيد الحجز',       value: `$${Math.round(stats.inEscrow).toLocaleString()}`,    color: '#ED8936', icon: FiClock },
          { label: 'Transactions',   labelAr: 'المعاملات',       value: stats.count,                                           color: '#9F7AEA', icon: FiArrowUpRight },
        ].map(c => (
          <Flex key={c.label} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={4} align="center" gap={3}>
            <Box bg={`${c.color}18`} p={2.5} borderRadius="lg">
              <Icon as={c.icon} color={c.color} boxSize={5} />
            </Box>
            <Box>
              <Text color="#8899AA" fontSize="xs">{c.label}</Text>
              <Text color="#5A7090" fontSize="xs">{c.labelAr}</Text>
              <Text color="white" fontWeight="700" fontSize="lg">{c.value}</Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>

      {/* Monthly Chart — built from real transactions */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6} mb={6}>
        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Text color="white" fontWeight="700">Transaction Volume vs Platform Fees</Text>
            <Text color="#8899AA" fontSize="xs">حجم المعاملات مقابل عمولة المنصة - آخر 6 أشهر</Text>
          </Box>
          <HStack spacing={4} fontSize="xs">
            <HStack><Box w={3} h={3} bg="#FF6B35" borderRadius="full" /><Text color="#8899AA">Volume</Text></HStack>
            <HStack><Box w={3} h={3} bg="#48BB78" borderRadius="full" /><Text color="#8899AA">Fees</Text></HStack>
          </HStack>
        </Flex>
        {monthlyData.length === 0 ? (
          <Flex justify="center" align="center" h="220px" direction="column" gap={2}>
            <Icon as={FiDollarSign} color="#2A4060" boxSize={10} />
            <Text color="#4A6080" fontSize="sm">No transaction data yet</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#48BB78" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#48BB78" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
              <XAxis dataKey="month" stroke="#4A6080" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4A6080" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" stroke="#FF6B35" strokeWidth={2} fill="url(#volGrad)" dot={false} />
              <Area type="monotone" dataKey="fees"   stroke="#48BB78" strokeWidth={2} fill="url(#feeGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Transactions Table */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" overflow="hidden">
        <Flex justify="space-between" align="center" p={5} borderBottom="1px solid #2A4060">
          <Text color="white" fontWeight="700">Transaction History / سجل المعاملات</Text>
          <Select w="160px" bg="#152438" border="1px solid #2A4060" color="#8899AA"
            borderRadius="xl" size="sm" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)} _focus={{ borderColor: '#FF6B35' }}>
            <option value=""           style={{ background: '#1A2E4A' }}>All Types</option>
            <option value="escrow"     style={{ background: '#1A2E4A' }}>Escrow</option>
            <option value="release"    style={{ background: '#1A2E4A' }}>Release</option>
            <option value="deposit"    style={{ background: '#1A2E4A' }}>Deposit</option>
            <option value="withdrawal" style={{ background: '#1A2E4A' }}>Withdrawal</option>
            <option value="refund"     style={{ background: '#1A2E4A' }}>Refund</option>
          </Select>
        </Flex>
        {loading ? (
          <Flex justify="center" py={16}><Spinner color="#FF6B35" size="lg" /></Flex>
        ) : filtered.length === 0 ? (
          <Flex justify="center" align="center" py={16} direction="column" gap={3}>
            <Icon as={FiDollarSign} color="#2A4060" boxSize={12} />
            <Text color="#8899AA">No transactions yet / لا توجد معاملات</Text>
          </Flex>
        ) : (
          <Box overflowX="auto">
            <Table variant="unstyled" size="sm" minW="600px">
              <Thead>
                <Tr bg="#152438">
                  {['From', 'To', 'Type', 'Amount', 'Description', 'Date'].map(h => (
                    <Th key={h} color="#8899AA" fontSize="xs" py={4} borderBottom="1px solid #2A4060" letterSpacing="wider">{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((t, i) => {
                  const tc = typeColor[t.type] || typeColor.deposit
                  return (
                    <Tr key={t._id || i} _hover={{ bg: '#152438' }} transition="all 0.15s">
                      <Td borderBottom="1px solid #1E3555" py={3.5}>
                        <HStack>
                          <Avatar size="xs" name={t.fromUserId?.username} bg="#FF6B35" color="white" />
                          <Text color="#8899AA" fontSize="xs">{t.fromUserId?.username || '—'}</Text>
                        </HStack>
                      </Td>
                      <Td borderBottom="1px solid #1E3555">
                        <HStack>
                          <Avatar size="xs" name={t.toUserId?.username} bg="#4299E1" color="white" />
                          <Text color="#8899AA" fontSize="xs">{t.toUserId?.username || '—'}</Text>
                        </HStack>
                      </Td>
                      <Td borderBottom="1px solid #1E3555">
                        <Badge px={2} py={0.5} borderRadius="lg" fontSize="xs" bg={tc.bg} color={tc.color}>
                          <HStack spacing={1}>
                            <Icon as={tc.icon} boxSize={3} />
                            <Text>{t.type}</Text>
                          </HStack>
                        </Badge>
                      </Td>
                      <Td borderBottom="1px solid #1E3555">
                        <Text color="#FF6B35" fontWeight="700" fontSize="sm">${t.amount?.toLocaleString()}</Text>
                      </Td>
                      <Td borderBottom="1px solid #1E3555">
                        <Text color="#8899AA" fontSize="xs" noOfLines={1}>{t.description || '—'}</Text>
                      </Td>
                      <Td borderBottom="1px solid #1E3555">
                        <Text color="#8899AA" fontSize="xs">{new Date(t.createdAt).toLocaleDateString()}</Text>
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
