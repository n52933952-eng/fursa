import {
  Box, Grid, Flex, Text, Icon, VStack, HStack, Avatar, Badge,
  Spinner, SimpleGrid
} from '@chakra-ui/react'
import {
  FiUsers, FiBriefcase, FiDollarSign, FiAlertTriangle,
  FiTrendingUp, FiActivity, FiCheckCircle, FiRefreshCw
} from 'react-icons/fi'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { SocketContext } from '../../context/SocketContext'
import axios from 'axios'

function StatCard({ icon, label, labelAr, value, change, color, onClick, live }) {
  return (
    <Box
      bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}
      cursor={onClick ? 'pointer' : 'default'}
      _hover={onClick ? { borderColor: color, transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${color}22` } : {}}
      transition="all 0.2s"
      onClick={onClick}
      position="relative"
    >
      {live && (
        <Box position="absolute" top={3} right={3}>
          <Box w={2} h={2} bg="#48BB78" borderRadius="full"
            sx={{ animation: 'pulse 2s infinite' }} />
        </Box>
      )}
      <Flex justify="space-between" align="start">
        <VStack align="start" spacing={1}>
          <Text color="#8899AA" fontSize="xs" fontWeight="600" letterSpacing="wide">{label}</Text>
          <Text color="#5A7090" fontSize="xs">{labelAr}</Text>
          <Text color="white" fontSize="3xl" fontWeight="black" lineHeight={1} mt={1}>{value}</Text>
          {change !== undefined && (
            <HStack spacing={1} mt={1}>
              <Icon as={FiTrendingUp} color="#48BB78" boxSize={3} />
              <Text color="#48BB78" fontSize="xs">+{change} new this month</Text>
            </HStack>
          )}
        </VStack>
        <Box bg={`${color}18`} p={3.5} borderRadius="xl">
          <Icon as={icon} color={color} boxSize={6} />
        </Box>
      </Flex>
    </Box>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="lg" p={3}>
      <Text color="#8899AA" fontSize="xs" mb={1}>{label}</Text>
      {payload.map(p => (
        <Text key={p.name} color="white" fontSize="sm" fontWeight="600">
          {p.name}:{' '}
          <Text as="span" color={p.name === 'revenue' ? '#FF6B35' : '#4299E1'}>
            {p.name === 'revenue' || p.name === 'fees' ? `$${p.value.toLocaleString()}` : p.value}
          </Text>
        </Text>
      ))}
    </Box>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]           = useState(null)
  const [users, setUsers]           = useState([])
  const [disputes, setDisputes]     = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const navigate = useNavigate()
  const { socket } = useContext(SocketContext)

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, disputesRes, revenueRes, categoryRes] = await Promise.all([
        axios.get('/api/admin/stats',           { withCredentials: true }),
        axios.get('/api/admin/users',           { withCredentials: true }),
        axios.get('/api/admin/disputes',        { withCredentials: true }),
        axios.get('/api/admin/monthly-revenue', { withCredentials: true }),
        axios.get('/api/admin/category-stats',  { withCredentials: true }),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data.slice(0, 5))
      setDisputes(disputesRes.data.filter(d => d.status === 'open').slice(0, 4))
      setRevenueData(Array.isArray(revenueRes.data) ? revenueRes.data : [])
      setCategoryData(Array.isArray(categoryRes.data) ? categoryRes.data : [])
      setLastUpdate(new Date())
    } catch {
      setStats({ totalUsers: 0, totalProjects: 0, activeProjects: 0, totalRevenue: 0, openDisputes: 0, newUsersThisMonth: 0 })
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return

    const handle = ({ type, data }) => {
      setLastUpdate(new Date())

      if (type === 'newUser') {
        setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : prev)
        setUsers(prev => [data, ...prev].slice(0, 5))
      }

      if (type === 'newProject') {
        setStats(prev => prev ? {
          ...prev,
          activeProjects: data.status === 'in-progress' ? prev.activeProjects + 1 : prev.activeProjects
        } : prev)
      }

      if (type === 'newDispute') {
        setStats(prev => prev ? { ...prev, openDisputes: prev.openDisputes + 1 } : prev)
        setDisputes(prev => [data, ...prev].slice(0, 4))
      }

      if (type === 'newTransaction' && data.type === 'release') {
        setStats(prev => prev ? { ...prev, totalRevenue: (prev.totalRevenue || 0) + data.amount } : prev)
      }
    }

    socket.on('adminUpdate', handle)
    return () => socket.off('adminUpdate', handle)
  }, [socket])

  if (loading) return (
    <Flex justify="center" align="center" h="60vh" direction="column" gap={4}>
      <Spinner color="#FF6B35" size="xl" thickness="3px" />
      <Text color="#8899AA">Loading dashboard...</Text>
    </Flex>
  )

  return (
    <Box>
      {/* Page Header */}
      <Flex justify="space-between" align="center" mb={7}>
        <Box>
          <Text color="white" fontSize="2xl" fontWeight="800">Dashboard Overview</Text>
          <Text color="#8899AA" fontSize="sm">نظرة عامة على المنصة</Text>
        </Box>
        <HStack spacing={3}>
          {lastUpdate && (
            <Text color="#4A6080" fontSize="xs">
              Updated {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
          <Badge bg="rgba(72,187,120,0.15)" color="#48BB78" px={3} py={1} borderRadius="full" fontSize="sm">
            <HStack spacing={1}>
              <Icon as={FiActivity} boxSize={3} />
              <Text>Live</Text>
            </HStack>
          </Badge>
        </HStack>
      </Flex>

      {/* Stat Cards */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={6}>
        <StatCard
          icon={FiUsers} label="Total Users" labelAr="إجمالي المستخدمين"
          value={stats?.totalUsers ?? 0}
          change={stats?.newUsersThisMonth}
          color="#4299E1" live
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          icon={FiBriefcase} label="Active Projects" labelAr="المشاريع النشطة"
          value={stats?.activeProjects ?? 0}
          color="#9F7AEA" live
          onClick={() => navigate('/admin/projects')}
        />
        <StatCard
          icon={FiDollarSign} label="Total Revenue" labelAr="إجمالي الإيرادات"
          value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          color="#48BB78" live
          onClick={() => navigate('/admin/transactions')}
        />
        <StatCard
          icon={FiAlertTriangle} label="Open Disputes" labelAr="النزاعات المفتوحة"
          value={stats?.openDisputes ?? 0}
          color="#FC8181" live
          onClick={() => navigate('/admin/disputes')}
        />
      </SimpleGrid>

      {/* Charts Row */}
      <Grid templateColumns={{ base: '1fr', xl: '3fr 2fr' }} gap={4} mb={6}>
        {/* Revenue Chart */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Flex justify="space-between" align="center" mb={5}>
            <Box>
              <Text color="white" fontWeight="700" fontSize="md">Revenue Overview</Text>
              <Text color="#8899AA" fontSize="xs">الإيرادات الشهرية - آخر 6 أشهر</Text>
            </Box>
            <HStack spacing={2}>
              <Icon as={FiRefreshCw} color="#4A6080" boxSize={3} cursor="pointer"
                onClick={fetchData} _hover={{ color: '#FF6B35' }} />
              <Badge bg="rgba(255,107,53,0.15)" color="#FF6B35" px={2} borderRadius="md" fontSize="xs">
                Live Data
              </Badge>
            </HStack>
          </Flex>
          {revenueData.length === 0 ? (
            <Flex justify="center" align="center" h="200px" direction="column" gap={2}>
              <Icon as={FiDollarSign} color="#2A4060" boxSize={10} />
              <Text color="#4A6080" fontSize="sm">No transaction data yet</Text>
              <Text color="#4A6080" fontSize="xs">لا توجد بيانات معاملات بعد</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
                <XAxis dataKey="month" stroke="#4A6080" tick={{ fontSize: 11 }} />
                <YAxis stroke="#4A6080" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2.5}
                  fill="url(#revenueGrad)" dot={{ fill: '#FF6B35', r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>

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
              <Text color="#4A6080" fontSize="xs">لا توجد مشاريع بعد</Text>
            </Flex>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
                <XAxis dataKey="name" stroke="#4A6080" tick={{ fontSize: 11 }} />
                <YAxis stroke="#4A6080" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#FF6B35" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Grid>

      {/* Bottom Row: Recent Users + Open Disputes */}
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4}>
        {/* Recent Users */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <Box>
              <Text color="white" fontWeight="700">Recent Users</Text>
              <Text color="#8899AA" fontSize="xs">أحدث المستخدمين</Text>
            </Box>
            <Text color="#FF6B35" fontSize="sm" cursor="pointer" _hover={{ textDecor: 'underline' }}
              onClick={() => navigate('/admin/users')}>
              View all →
            </Text>
          </Flex>
          <VStack spacing={3} align="stretch">
            {users.length === 0 ? (
              <Text color="#8899AA" fontSize="sm" textAlign="center" py={4}>No users yet</Text>
            ) : users.map(u => (
              <Flex key={u._id} align="center" justify="space-between" p={3} bg="#152438" borderRadius="xl">
                <HStack spacing={3}>
                  <Avatar size="sm" name={u.username} bg="#FF6B35" color="white" />
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="600">{u.username}</Text>
                    <Text color="#8899AA" fontSize="xs">{u.email}</Text>
                  </Box>
                </HStack>
                <Badge
                  px={2} py={0.5} borderRadius="lg" fontSize="xs" fontWeight="600"
                  bg={u.role === 'freelancer' ? 'rgba(66,153,225,0.15)' : 'rgba(72,187,120,0.15)'}
                  color={u.role === 'freelancer' ? '#4299E1' : '#48BB78'}
                >
                  {u.role}
                </Badge>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Open Disputes */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <Box>
              <Text color="white" fontWeight="700">Open Disputes</Text>
              <Text color="#8899AA" fontSize="xs">النزاعات تحتاج مراجعة</Text>
            </Box>
            <Text color="#FF6B35" fontSize="sm" cursor="pointer" _hover={{ textDecor: 'underline' }}
              onClick={() => navigate('/admin/disputes')}>
              View all →
            </Text>
          </Flex>
          <VStack spacing={3} align="stretch">
            {disputes.length === 0 ? (
              <Flex direction="column" align="center" py={6} gap={2}>
                <Icon as={FiCheckCircle} color="#48BB78" boxSize={8} />
                <Text color="#48BB78" fontSize="sm" fontWeight="600">No open disputes!</Text>
                <Text color="#8899AA" fontSize="xs">لا توجد نزاعات مفتوحة</Text>
              </Flex>
            ) : disputes.map(d => (
              <Box key={d._id} p={3} bg="#152438" borderRadius="xl" cursor="pointer"
                _hover={{ borderColor: '#FF6B35' }} border="1px solid transparent"
                onClick={() => navigate('/admin/disputes')}>
                <Flex justify="space-between" align="start" mb={1}>
                  <Text color="white" fontSize="sm" fontWeight="600" noOfLines={1}>
                    {d.projectId?.title || 'Unknown Project'}
                  </Text>
                  <Badge bg="rgba(252,129,129,0.15)" color="#FC8181" fontSize="xs" px={2} borderRadius="md">
                    {d.status}
                  </Badge>
                </Flex>
                <Text color="#8899AA" fontSize="xs" noOfLines={2}>{d.reason}</Text>
                <Text color="#4A6080" fontSize="xs" mt={1}>
                  {new Date(d.createdAt).toLocaleDateString()}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      </Grid>
    </Box>
  )
}
