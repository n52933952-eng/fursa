import {
  Box, Flex, Text, Icon, SimpleGrid, VStack, HStack, Badge, Spinner, Grid
} from '@chakra-ui/react'
import {
  FiTrendingUp, FiUsers, FiDollarSign, FiBriefcase,
  FiCheckCircle, FiClock, FiAlertTriangle, FiActivity
} from 'react-icons/fi'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useEffect, useState, useContext } from 'react'
import { SocketContext } from '../../context/SocketContext'
import axios from 'axios'

const COLORS = ['#FF6B35', '#4299E1', '#48BB78', '#9F7AEA', '#ED8936', '#FC8181', '#38B2AC', '#ECC94B']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="lg" p={3} minW="140px">
      <Text color="#8899AA" fontSize="xs" mb={1}>{label}</Text>
      {payload.map((p, i) => (
        <Text key={i} color="white" fontSize="sm">
          {p.name}:{' '}
          <Text as="span" color={p.color} fontWeight="700">
            {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue') || p.name?.toLowerCase().includes('fee')
              ? `$${p.value.toLocaleString()}`
              : p.value}
          </Text>
        </Text>
      ))}
    </Box>
  )
}

const renderPieLabel = ({ name, percent }) =>
  percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''

export default function AdminAnalytics() {
  const [stats, setStats]           = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]       = useState(true)
  const { socket } = useContext(SocketContext)

  const fetchAll = async () => {
    try {
      const [statsRes, revenueRes, categoryRes, txRes] = await Promise.all([
        axios.get('/api/admin/stats',           { withCredentials: true }),
        axios.get('/api/admin/monthly-revenue', { withCredentials: true }),
        axios.get('/api/admin/category-stats',  { withCredentials: true }),
        axios.get('/api/admin/transactions',    { withCredentials: true }),
      ])
      setStats(statsRes.data)
      setMonthlyData(Array.isArray(revenueRes.data) ? revenueRes.data : [])
      setCategoryData(Array.isArray(categoryRes.data) ? categoryRes.data : [])
      setTransactions(Array.isArray(txRes.data) ? txRes.data : [])
    } catch {
      setStats(null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // Real-time updates
  useEffect(() => {
    if (!socket) return
    const handle = ({ type }) => {
      if (['newUser', 'newProject', 'newTransaction', 'newDispute'].includes(type)) {
        fetchAll()
      }
    }
    socket.on('adminUpdate', handle)
    return () => socket.off('adminUpdate', handle)
  }, [socket])

  // Derived stats from transactions
  const txStats = {
    deposit:    transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0),
    escrow:     transactions.filter(t => t.type === 'escrow').reduce((s, t) => s + t.amount, 0),
    release:    transactions.filter(t => t.type === 'release').reduce((s, t) => s + t.amount, 0),
    withdrawal: transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0),
  }

  const txTypeData = Object.entries(txStats)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value: Math.round(value) }))

  if (loading) return (
    <Flex justify="center" align="center" h="60vh" direction="column" gap={4}>
      <Spinner color="#FF6B35" size="xl" thickness="3px" />
      <Text color="#8899AA">Loading analytics...</Text>
    </Flex>
  )

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={7}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">Platform Analytics</Text>
          <Text color="#8899AA" fontSize="sm">تحليلات المنصة الشاملة</Text>
        </Box>
        <Badge bg="rgba(72,187,120,0.15)" color="#48BB78" px={3} py={1} borderRadius="full" fontSize="sm">
          <HStack spacing={1}>
            <Icon as={FiActivity} boxSize={3} />
            <Text>Live Data</Text>
          </HStack>
        </Badge>
      </Flex>

      {/* KPI Cards */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={6}>
        {[
          { label: 'Total Users',       labelAr: 'المستخدمون',     value: stats?.totalUsers ?? 0,        color: '#4299E1', icon: FiUsers,        sub: `+${stats?.newUsersThisMonth ?? 0} this month` },
          { label: 'Total Projects',    labelAr: 'المشاريع',       value: stats?.totalProjects ?? 0,     color: '#9F7AEA', icon: FiBriefcase,    sub: `${stats?.activeProjects ?? 0} active` },
          { label: 'Platform Revenue',  labelAr: 'إيرادات المنصة', value: `$${Math.round((stats?.totalRevenue ?? 0) * 0.1).toLocaleString()}`, color: '#48BB78', icon: FiDollarSign, sub: '10% of releases' },
          { label: 'Open Disputes',     labelAr: 'النزاعات',       value: stats?.openDisputes ?? 0,      color: '#FC8181', icon: FiAlertTriangle, sub: 'needs attention' },
        ].map(c => (
          <Box key={c.label} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}>
            <Flex justify="space-between" align="start">
              <VStack align="start" spacing={1}>
                <Text color="#8899AA" fontSize="xs" fontWeight="600" letterSpacing="wide">{c.label}</Text>
                <Text color="#5A7090" fontSize="xs">{c.labelAr}</Text>
                <Text color="white" fontSize="3xl" fontWeight="black" lineHeight={1} mt={1}>{c.value}</Text>
                <HStack spacing={1} mt={1}>
                  <Icon as={FiTrendingUp} color="#48BB78" boxSize={3} />
                  <Text color="#48BB78" fontSize="xs">{c.sub}</Text>
                </HStack>
              </VStack>
              <Box bg={`${c.color}18`} p={3.5} borderRadius="xl">
                <Icon as={c.icon} color={c.color} boxSize={6} />
              </Box>
            </Flex>
          </Box>
        ))}
      </SimpleGrid>

      {/* Revenue & User Growth Chart */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6} mb={5}>
        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Text color="white" fontWeight="700" fontSize="md">Revenue & User Growth</Text>
            <Text color="#8899AA" fontSize="xs">الإيرادات ونمو المستخدمين - آخر 6 أشهر</Text>
          </Box>
          <HStack spacing={4} fontSize="xs">
            <HStack><Box w={3} h={3} bg="#FF6B35" borderRadius="full" /><Text color="#8899AA">Revenue ($)</Text></HStack>
            <HStack><Box w={3} h={3} bg="#4299E1" borderRadius="full" /><Text color="#8899AA">New Users</Text></HStack>
          </HStack>
        </Flex>
        {monthlyData.length === 0 ? (
          <Flex justify="center" align="center" h="240px" direction="column" gap={2}>
            <Icon as={FiTrendingUp} color="#2A4060" boxSize={10} />
            <Text color="#4A6080" fontSize="sm">No data yet — data appears once transactions are made</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4299E1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4299E1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
              <XAxis dataKey="month" stroke="#4A6080" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#4A6080" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#4A6080" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="left"  type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#FF6B35" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#FF6B35', r: 4 }} activeDot={{ r: 6 }} />
              <Area yAxisId="right" type="monotone" dataKey="users"   name="New Users"   stroke="#4299E1" strokeWidth={2}   fill="url(#userGrad)" dot={{ fill: '#4299E1', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Two-column: Category bar + Transaction pie */}
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5} mb={5}>
        {/* Projects by Category */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Box mb={5}>
            <Text color="white" fontWeight="700" fontSize="md">Projects by Category</Text>
            <Text color="#8899AA" fontSize="xs">المشاريع حسب الفئة</Text>
          </Box>
          {categoryData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" direction="column" gap={2}>
              <Icon as={FiBriefcase} color="#2A4060" boxSize={10} />
              <Text color="#4A6080" fontSize="sm">No projects yet</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
                <XAxis dataKey="name" stroke="#4A6080" tick={{ fontSize: 10 }} />
                <YAxis stroke="#4A6080" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>

        {/* Transaction Type Breakdown */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Box mb={5}>
            <Text color="white" fontWeight="700" fontSize="md">Transaction Breakdown</Text>
            <Text color="#8899AA" fontSize="xs">توزيع أنواع المعاملات</Text>
          </Box>
          {txTypeData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" direction="column" gap={2}>
              <Icon as={FiDollarSign} color="#2A4060" boxSize={10} />
              <Text color="#4A6080" fontSize="sm">No transactions yet</Text>
            </Flex>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={txTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="value" label={renderPieLabel} labelLine={false}>
                    {txTypeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ background: '#1A2E4A', border: '1px solid #2A4060', borderRadius: 8 }} itemStyle={{ color: 'white' }} labelStyle={{ color: '#8899AA' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <Flex flexWrap="wrap" gap={2} mt={3} justify="center">
                {txTypeData.map((item, i) => (
                  <HStack key={item.name} spacing={1}>
                    <Box w={2.5} h={2.5} borderRadius="full" bg={COLORS[i % COLORS.length]} />
                    <Text color="#8899AA" fontSize="xs">{item.name}</Text>
                    <Text color="white" fontSize="xs" fontWeight="700">${item.value.toLocaleString()}</Text>
                  </HStack>
                ))}
              </Flex>
            </>
          )}
        </Box>
      </Grid>

      {/* Platform Fee Revenue (10% of releases) */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Text color="white" fontWeight="700" fontSize="md">Platform Fee Collection</Text>
            <Text color="#8899AA" fontSize="xs">تجميع رسوم المنصة شهرياً (10% من المدفوعات)</Text>
          </Box>
          <Badge bg="rgba(72,187,120,0.15)" color="#48BB78" px={2} borderRadius="md" fontSize="xs">
            10% of Releases
          </Badge>
        </Flex>
        {monthlyData.length === 0 ? (
          <Flex justify="center" align="center" h="180px" direction="column" gap={2}>
            <Icon as={FiDollarSign} color="#2A4060" boxSize={10} />
            <Text color="#4A6080" fontSize="sm">No fee data yet</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
              <XAxis dataKey="month" stroke="#4A6080" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4A6080" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="fees" name="Platform Fees ($)" stroke="#48BB78"
                strokeWidth={2.5} dot={{ fill: '#48BB78', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  )
}
