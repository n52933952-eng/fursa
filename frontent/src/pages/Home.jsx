import { Box, Flex, Grid, Text, Input, Button, Badge, Avatar, HStack, VStack, Icon, Spinner } from '@chakra-ui/react'
import { FiSearch, FiClock, FiDollarSign, FiStar, FiBriefcase, FiTrendingUp } from 'react-icons/fi'
import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
import axios from 'axios'

const categories = [
  { label: 'All / الكل', value: '' },
  { label: 'Design / تصميم', value: 'Design' },
  { label: 'Development / تطوير', value: 'Development' },
  { label: 'Writing / كتابة', value: 'Writing' },
  { label: 'Marketing / تسويق', value: 'Marketing' },
  { label: 'Video / فيديو', value: 'Video' },
  { label: 'Translation / ترجمة', value: 'Translation' },
]

function ProjectCard({ project, onClick }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(project.deadline) - new Date()) / 86400000))
  return (
    <Box
      bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl"
      p={5} cursor="pointer"
      _hover={{ borderColor: '#FF6B35', transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(255,107,53,0.12)' }}
      transition="all 0.22s"
      onClick={onClick}
    >
      <Flex justify="space-between" align="start" mb={3}>
        <Badge bg="rgba(255,107,53,0.15)" color="#FF6B35" borderRadius="lg" px={2.5} py={0.5} fontSize="xs" fontWeight="600">
          {project.category}
        </Badge>
        <HStack spacing={1}>
          <Icon as={FiClock} color="#8899AA" boxSize={3} />
          <Text color="#8899AA" fontSize="xs">{daysLeft}d left</Text>
        </HStack>
      </Flex>

      <Text color="white" fontWeight="700" fontSize="md" mb={2} noOfLines={2} lineHeight="1.4">
        {project.title}
      </Text>
      <Text color="#8899AA" fontSize="sm" mb={4} noOfLines={2} lineHeight="1.6">
        {project.description}
      </Text>

      {/* Skills */}
      {project.skills?.length > 0 && (
        <Flex gap={1} mb={4} flexWrap="wrap">
          {project.skills.slice(0, 3).map(skill => (
            <Badge key={skill} bg="#152438" color="#8899AA" borderRadius="md" fontSize="xs" px={2}>{skill}</Badge>
          ))}
        </Flex>
      )}

      <Flex justify="space-between" align="center">
        <HStack spacing={1}>
          <Icon as={FiDollarSign} color="#FF6B35" boxSize={4} />
          <Text color="#FF6B35" fontWeight="700" fontSize="md">${project.budget}</Text>
          <Text color="#4A6080" fontSize="xs">/ {project.budgetType}</Text>
        </HStack>
        <HStack spacing={1.5}>
          <Avatar size="xs" name={project.clientId?.username} bg="#FF6B35" color="white" />
          <Text color="#8899AA" fontSize="xs">{project.clientId?.username}</Text>
        </HStack>
      </Flex>
    </Box>
  )
}

export default function Home() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const { user } = useContext(UserContext)
  const navigate = useNavigate()

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (category) params.category = category
      const { data } = await axios.get('/api/project', { params, withCredentials: true })
      setProjects(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [category])

  return (
    <Box>
      {/* Hero search banner */}
      <Box bg="linear-gradient(135deg, #1A2E4A 0%, #152438 100%)" borderRadius="2xl" p={8} mb={6} border="1px solid #2A4060">
        <Text color="white" fontWeight="800" fontSize="2xl" mb={1}>
          Find Your Next Project
        </Text>
        <Text color="#8899AA" fontSize="sm" mb={5}>
          اكتشف المشاريع المناسبة لمهاراتك
        </Text>
        <Flex gap={3}>
          <Flex
            flex={1} align="center" bg="#152438" border="1px solid #2A4060"
            borderRadius="xl" px={4} _focusWithin={{ borderColor: '#FF6B35' }} transition="all 0.2s"
          >
            <Icon as={FiSearch} color="#8899AA" mr={3} flexShrink={0} />
            <Input
              variant="unstyled" color="white" placeholder="Search projects... / ابحث عن مشاريع"
              _placeholder={{ color: '#4A6080' }}
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchProjects()}
              py={3}
            />
          </Flex>
          <Button
            bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }}
            borderRadius="xl" px={6} onClick={fetchProjects}
            leftIcon={<Icon as={FiSearch} />}
          >
            Search
          </Button>
          {user?.role === 'client' && (
            <Button
              variant="outline" borderColor="#FF6B35" color="#FF6B35"
              _hover={{ bg: 'rgba(255,107,53,0.1)' }}
              borderRadius="xl" px={5}
              onClick={() => navigate('/post-project')}
            >
              + Post Project
            </Button>
          )}
        </Flex>
      </Box>

      {/* Category Pills */}
      <Flex gap={2} mb={6} overflowX="auto" pb={1}
        sx={{ '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {categories.map(cat => (
          <Button
            key={cat.value} size="sm" borderRadius="full" flexShrink={0}
            bg={category === cat.value ? '#FF6B35' : '#1A2E4A'}
            color={category === cat.value ? 'white' : '#8899AA'}
            border="1px solid"
            borderColor={category === cat.value ? '#FF6B35' : '#2A4060'}
            _hover={{ bg: '#FF6B35', color: 'white', borderColor: '#FF6B35' }}
            onClick={() => setCategory(cat.value)}
            transition="all 0.18s"
            fontWeight={category === cat.value ? '600' : '400'}
          >
            {cat.label}
          </Button>
        ))}
      </Flex>

      {/* Results header */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={2}>
          <Icon as={FiBriefcase} color="#FF6B35" />
          <Text color="white" fontWeight="600" fontSize="sm">
            {loading ? 'Loading...' : `${projects.length} Project${projects.length !== 1 ? 's' : ''} Found`}
          </Text>
        </HStack>
        <HStack spacing={1}>
          <Icon as={FiTrendingUp} color="#8899AA" boxSize={3.5} />
          <Text color="#8899AA" fontSize="xs">Latest first</Text>
        </HStack>
      </Flex>

      {/* Grid */}
      {loading ? (
        <Flex justify="center" align="center" py={24} direction="column" gap={4}>
          <Spinner color="#FF6B35" size="xl" thickness="3px" />
          <Text color="#8899AA" fontSize="sm">Loading projects...</Text>
        </Flex>
      ) : projects.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py={24} gap={4}>
          <Icon as={FiBriefcase} boxSize={12} color="#2A4060" />
          <Text color="#8899AA" fontSize="lg" fontWeight="600">No projects found</Text>
          <Text color="#4A6080" fontSize="sm">لا توجد مشاريع متاحة حالياً</Text>
          {user?.role === 'client' && (
            <Button bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} borderRadius="xl" mt={2}
              onClick={() => navigate('/post-project')}>
              Post the First Project
            </Button>
          )}
        </Flex>
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap={4}>
          {projects.map(project => (
            <ProjectCard
              key={project._id}
              project={project}
              onClick={() => navigate(`/project/${project._id}`)}
            />
          ))}
        </Grid>
      )}
    </Box>
  )
}
