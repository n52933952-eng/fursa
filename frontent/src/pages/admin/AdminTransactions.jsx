import {
  Box, Flex, Text, Icon, Badge, HStack, Avatar,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, SimpleGrid, Select
} from '@chakra-ui/react'
import { FiDollarSign, FiArrowUpRight, FiArrowDownLeft, FiClock, FiTrendingUp } from 'react-icons/fi'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'
import axios from 'axios'

const monthlyData = [
  { month: 'Jan', volume: 8200,  fees: 820  },
  { month: 'Feb', volume: 14500, fees: 1450 },
  { month: 'Mar', volume: 19000, fees: 1900 },
  { month: 'Apr', volume: 27000, fees: 2700 },
  { month: 'May', volume: 38000, fees: 3800 },
  { month: 'Jun', volume: 52000, fees: 5200 },
]

const typeColor = {
  escrow:   { bg: 'rgba(66,153,225,0.15)',  color: '#4299E1',  icon: FiClock },
  release:  { bg: 'rgba(72,187,120,0.15)',  color: '#48BB78',  icon: FiArrowUpRight },
  deposit:  { bg: 'rgba(159,122,234,0.15)', color: '#9F7AEA',  icon: FiArrowDownLeft },
  withdraw: { bg: 'rgba(252,129,129,0.15)', color: '#FC8181',  icon: FiArrowUpRight },
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

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    const fetchTx = async () => {
      try {
        // Fetch all wallets or a transactions endpoint
        const { data } = await axios.get('/api/wallet/all', { withCredentials: true })
        setTransactions(data || [])
      } catch {
        setTransactions([])
      }
      setLoading(false)
    }
    fetchTx()
  }, [])

  const totalVolume = monthlyData.reduce((s, m) => s + m.volume, 0)
  const totalFees = monthlyData.reduce((s, m) => s + m.fees, 0)

  const filtered = transactions.filter(t => !typeFilter || t.type === typeFilter)

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">Financial Monitoring</Text>
          <Text color="#8899AA" fontSize="sm">مراقبة المعاملات المالية</Text>
        </Box>
      </Flex>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={6}>
        {[
          { label: 'Total Volume', labelAr: 'حجم المعاملات', value: `$${totalVolume.toLocaleString()}`, color: '#4299E1', icon: FiDollarSign },
          { label: 'Platform Fees', labelAr: 'عمولة المنصة', value: `$${totalFees.toLocaleString()}`, color: '#48BB78', icon: FiTrendingUp },
          { label: 'In Escrow', labelAr: 'قيد الحجز', value: '$0', color: '#ED8936', icon: FiClock },
          { label: 'Transactions', labelAr: 'المعاملات', value: transactions.length, color: '#9F7AEA', icon: FiArrowUpRight },
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

      {/* Chart */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6} mb={6}>
        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Text color="white" fontWeight="700">Transaction Volume vs Platform Fees</Text>
            <Text color="#8899AA" fontSize="xs">حجم المعاملات مقابل عمولة المنصة</Text>
          </Box>
          <HStack spacing={4} fontSize="xs">
            <HStack><Box w={3} h={3} bg="#FF6B35" borderRadius="full" /><Text color="#8899AA">Volume</Text></HStack>
            <HStack><Box w={3} h={3} bg="#48BB78" borderRadius="full" /><Text color="#8899AA">Fees</Text></HStack>
          </HStack>
        </Flex>
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
            <Area type="monotone" dataKey="volume" stroke="#FF6B35" strokeWidth={2}
              fill="url(#volGrad)" dot={false} />
            <Area type="monotone" dataKey="fees" stroke="#48BB78" strokeWidth={2}
              fill="url(#feeGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* Transactions Table */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" overflow="hidden">
        <Flex justify="space-between" align="center" p={5} borderBottom="1px solid #2A4060">
          <Text color="white" fontWeight="700">Transaction History / سجل المعاملات</Text>
          <Select w="160px" bg="#152438" border="1px solid #2A4060" color="#8899AA"
            borderRadius="xl" size="sm" value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)} _focus={{ borderColor: '#FF6B35' }}>
            <option value="" style={{ background: '#1A2E4A' }}>All Types</option>
            <option value="escrow" style={{ background: '#1A2E4A' }}>Escrow</option>
            <option value="release" style={{ background: '#1A2E4A' }}>Release</option>
            <option value="deposit" style={{ background: '#1A2E4A' }}>Deposit</option>
            <option value="withdraw" style={{ background: '#1A2E4A' }}>Withdraw</option>
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
          <Table variant="unstyled" size="sm" minW="500px">
            <Thead>
              <Tr bg="#152438">
                {['User', 'Type', 'Amount', 'Description', 'Date'].map(h => (
                  <Th key={h} color="#8899AA" fontSize="xs" py={4} borderBottom="1px solid #2A4060" letterSpacing="wider">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((t, i) => {
                const tc = typeColor[t.type] || typeColor.deposit
                return (
                  <Tr key={i} _hover={{ bg: '#152438' }} transition="all 0.15s">
                    <Td borderBottom="1px solid #1E3555" py={3.5}>
                      <HStack>
                        <Avatar size="xs" name={t.userId?.username} bg="#FF6B35" color="white" />
                        <Text color="#8899AA" fontSize="xs">{t.userId?.username || 'N/A'}</Text>
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
                      <Text color="#FF6B35" fontWeight="700" fontSize="sm">${t.amount}</Text>
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
