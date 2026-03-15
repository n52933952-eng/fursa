import {
  Box, Grid, Flex, Text, Icon, VStack, HStack, Avatar, Badge,
  Spinner, SimpleGrid, Divider
} from '@chakra-ui/react'
import {
  FiUsers, FiBriefcase, FiDollarSign, FiAlertTriangle,
  FiTrendingUp, FiUserCheck, FiActivity, FiCheckCircle
} from 'react-icons/fi'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const revenueData = [
  { month: 'Jan', revenue: 12000, users: 45 },
  { month: 'Feb', revenue: 18500, users: 72 },
  { month: 'Mar', revenue: 24000, users: 98 },
  { month: 'Apr', revenue: 31000, users: 134 },
  { month: 'May', revenue: 42000, users: 187 },
  { month: 'Jun', revenue: 56000, users: 241 },
]

const categoryData = [
  { name: 'Design', count: 34 },
  { name: 'Dev', count: 67 },
  { name: 'Writing', count: 21 },
  { name: 'Marketing', count: 18 },
  { name: 'Video', count: 12 },
]

function StatCard({ icon, label, labelAr, value, change, color, onClick }) {
  return (
    <Box
      bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}
      cursor={onClick ? 'pointer' : 'default'}
      _hover={onClick ? { borderColor: color, transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${color}22` } : {}}
      transition="all 0.2s"
      onClick={onClick}
    >
      <Flex justify="space-between" align="start">
        <VStack align="start" spacing={1}>
          <Text color="#8899AA" fontSize="xs" fontWeight="600" letterSpacing="wide">{label}</Text>
          <Text color="#5A7090" fontSize="xs">{labelAr}</Text>
          <Text color="white" fontSize="3xl" fontWeight="black" lineHeight={1} mt={1}>{value}</Text>
          {change !== undefined && (
            <HStack spacing={1} mt={1}>
              <Icon as={FiTrendingUp} color="#48BB78" boxSize={3} />
              <Text color="#48BB78" fontSize="xs">+{change}% this month</Text>
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
          {p.name}: <Text as="span" color="#FF6B35">{p.name === 'revenue' ? `$${p.value.toLocaleString()}` : p.value}</Text>
        </Text>
      ))}
    </Box>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes, disputesRes] = await Promise.all([
          axios.get('/api/admin/stats', { withCredentials: true }),
          axios.get('/api/admin/users', { withCredentials: true }),
          axios.get('/api/admin/disputes', { withCredentials: true }),
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data.slice(0, 5))
        setDisputes(disputesRes.data.filter(d => d.status === 'open').slice(0, 4))
      } catch (e) {
        // Use placeholder data if API not ready
        setStats({ totalUsers: 0, activeProjects: 0, totalRevenue: 0, openDisputes: 0 })
        setUsers([])
        setDisputes([])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

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
        <Badge bg="rgba(72,187,120,0.15)" color="#48BB78" px={3} py={1} borderRadius="full" fontSize="sm">
          <HStack spacing={1}>
            <Icon as={FiActivity} boxSize={3} />
            <Text>System Online</Text>
          </HStack>
        </Badge>
      </Flex>

      {/* Stat Cards */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={6}>
        <StatCard
          icon={FiUsers} label="Total Users" labelAr="إجمالي المستخدمين"
          value={stats?.totalUsers ?? 0} change={12} color="#4299E1"
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          icon={FiBriefcase} label="Active Projects" labelAr="المشاريع النشطة"
          value={stats?.activeProjects ?? 0} change={8} color="#9F7AEA"
          onClick={() => navigate('/admin/projects')}
        />
        <StatCard
          icon={FiDollarSign} label="Total Revenue" labelAr="إجمالي الإيرادات"
          value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`} change={24} color="#48BB78"
          onClick={() => navigate('/admin/transactions')}
        />
        <StatCard
          icon={FiAlertTriangle} label="Open Disputes" labelAr="النزاعات المفتوحة"
          value={stats?.openDisputes ?? 0} color="#FC8181"
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
              <Text color="#8899AA" fontSize="xs">نظرة على الإيرادات الشهرية</Text>
            </Box>
            <Badge bg="rgba(255,107,53,0.15)" color="#FF6B35" px={2} borderRadius="md" fontSize="xs">2026</Badge>
          </Flex>
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
        </Box>

        {/* Projects by Category */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Box mb={5}>
            <Text color="white" fontWeight="700" fontSize="md">Projects by Category</Text>
            <Text color="#8899AA" fontSize="xs">المشاريع حسب الفئة</Text>
          </Box>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
              <XAxis dataKey="name" stroke="#4A6080" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4A6080" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#FF6B35" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
