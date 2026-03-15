import { Box, Grid, Flex, Text, Icon, VStack, HStack, Avatar, Badge, Button, Spinner, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react'
import { FiUsers, FiBriefcase, FiDollarSign, FiAlertTriangle } from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'
import axios from 'axios'

const revenueData = [
  { month: 'Jan', revenue: 20000 },
  { month: 'Feb', revenue: 35000 },
  { month: 'Mar', revenue: 28000 },
  { month: 'Apr', revenue: 45000 },
  { month: 'May', revenue: 62000 },
  { month: 'Jun', revenue: 89400 },
]

const StatCard = ({ icon, label, value, color }) => (
  <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={5}>
    <Flex justify="space-between" align="center">
      <VStack align="start" spacing={1}>
        <Text color="#8899AA" fontSize="sm">{label}</Text>
        <Text color="white" fontSize="2xl" fontWeight="black">{value}</Text>
      </VStack>
      <Box bg={`${color}22`} p={3} borderRadius="xl">
        <Icon as={icon} color={color} boxSize={6} />
      </Box>
    </Flex>
  </Box>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes, disputesRes] = await Promise.all([
          axios.get('/api/admin/stats', { withCredentials: true }),
          axios.get('/api/admin/users', { withCredentials: true }),
          axios.get('/api/admin/disputes', { withCredentials: true }),
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data.slice(0, 8))
        setDisputes(disputesRes.data.slice(0, 5))
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [])

  const banUser = async (id) => {
    try {
      await axios.put(`/api/admin/ban/${id}`, {}, { withCredentials: true })
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBanned: true } : u))
    } catch {}
  }

  if (loading) return <Flex justify="center" py={20}><Spinner color="#FF6B35" size="xl" /></Flex>

  return (
    <Box>
      <Text color="white" fontSize="2xl" fontWeight="black" mb={6}>
        Admin Dashboard / لوحة الإدارة
      </Text>

      {/* Stats */}
      <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={6}>
        <StatCard icon={FiUsers} label="Total Users / المستخدمون" value={stats?.totalUsers || 0} color="#FF6B35" />
        <StatCard icon={FiBriefcase} label="Active Projects / المشاريع" value={stats?.activeProjects || 0} color="#4299E1" />
        <StatCard icon={FiDollarSign} label="Total Revenue / الإيرادات" value={`$${stats?.totalRevenue || 0}`} color="#48BB78" />
        <StatCard icon={FiAlertTriangle} label="Open Disputes / النزاعات" value={stats?.openDisputes || 0} color="#FC8181" />
      </Grid>

      {/* Chart + Disputes */}
      <Grid templateColumns="2fr 1fr" gap={4} mb={6}>
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={5}>
          <Text color="white" fontWeight="bold" mb={4}>Revenue Overview / نظرة عامة على الإيرادات</Text>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A4060" />
              <XAxis dataKey="month" stroke="#8899AA" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8899AA" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ bg: '#1E3555', border: '1px solid #2A4060' }} />
              <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} dot={{ fill: '#FF6B35' }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={5}>
          <Text color="white" fontWeight="bold" mb={4}>Open Disputes / النزاعات</Text>
          <VStack spacing={3} align="stretch">
            {disputes.length === 0 ? (
              <Text color="#8899AA" fontSize="sm">No open disputes</Text>
            ) : disputes.map(d => (
              <Box key={d._id} p={3} bg="#152438" borderRadius="lg">
                <Text color="white" fontSize="sm" noOfLines={1}>{d.projectId?.title}</Text>
                <Text color="#8899AA" fontSize="xs">{d.reason?.slice(0, 40)}...</Text>
                <Badge mt={1} colorScheme={d.status === 'open' ? 'red' : 'yellow'} fontSize="xs">
                  {d.status}
                </Badge>
              </Box>
            ))}
          </VStack>
        </Box>
      </Grid>

      {/* Users Table */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={5}>
        <Text color="white" fontWeight="bold" mb={4}>Users Management / إدارة المستخدمين</Text>
        <Table variant="unstyled" size="sm">
          <Thead>
            <Tr>
              {['User', 'Role', 'Status', 'Join Date', 'Actions'].map(h => (
                <Th key={h} color="#8899AA" fontSize="xs" borderBottom="1px solid #2A4060">{h}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {users.map(u => (
              <Tr key={u._id} _hover={{ bg: '#152438' }}>
                <Td borderBottom="1px solid #1E3555">
                  <HStack>
                    <Avatar size="xs" name={u.username} src={u.profilePic} />
                    <VStack align="start" spacing={0}>
                      <Text color="white" fontSize="sm">{u.username}</Text>
                      <Text color="#8899AA" fontSize="xs">{u.email}</Text>
                    </VStack>
                  </HStack>
                </Td>
                <Td borderBottom="1px solid #1E3555">
                  <Badge colorScheme={u.role === 'admin' ? 'purple' : u.role === 'freelancer' ? 'blue' : 'green'} fontSize="xs">
                    {u.role}
                  </Badge>
                </Td>
                <Td borderBottom="1px solid #1E3555">
                  <Badge colorScheme={u.isBanned ? 'red' : 'green'} fontSize="xs">
                    {u.isBanned ? 'Banned' : 'Active'}
                  </Badge>
                </Td>
                <Td borderBottom="1px solid #1E3555">
                  <Text color="#8899AA" fontSize="xs">{new Date(u.createdAt).toLocaleDateString()}</Text>
                </Td>
                <Td borderBottom="1px solid #1E3555">
                  <HStack>
                    <Button size="xs" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }}>Edit</Button>
                    {!u.isBanned && (
                      <Button size="xs" colorScheme="red" variant="outline" onClick={() => banUser(u._id)}>Ban</Button>
                    )}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  )
}
