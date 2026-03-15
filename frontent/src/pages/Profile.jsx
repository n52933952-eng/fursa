import { Box, Flex, Text, Avatar, VStack, HStack, Icon, Badge, Button, Tabs, TabList, Tab, TabPanels, TabPanel, SimpleGrid, Spinner } from '@chakra-ui/react'
import { FiStar, FiMapPin, FiBriefcase, FiDollarSign, FiMessageSquare } from 'react-icons/fi'
import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
import axios from 'axios'

export default function Profile() {
  const { id } = useParams()
  const { user } = useContext(UserContext)
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const [profileRes, reviewsRes] = await Promise.all([
          axios.get(`/api/user/${id}`, { withCredentials: true }),
          axios.get(`/api/review/${id}`)
        ])
        setProfile(profileRes.data)
        setReviews(reviewsRes.data)
      } catch {}
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return <Flex justify="center" py={20}><Spinner color="#FF6B35" size="xl" /></Flex>
  if (!profile) return <Text color="white">User not found</Text>

  return (
    <Box maxW="900px" mx="auto">
      {/* Cover + Profile */}
      <Box bg="linear-gradient(135deg, #1E3555, #2A4060)" borderRadius="2xl" p={8} mb={4} textAlign="center">
        <Avatar size="2xl" name={profile.username} src={profile.profilePic} mb={4} border="4px solid #FF6B35" />
        <Text color="white" fontSize="2xl" fontWeight="black">{profile.username}</Text>
        <Text color="#FF6B35" mb={2}>{profile.role}</Text>
        <HStack justify="center" spacing={4} mb={4}>
          {profile.country && <HStack><Icon as={FiMapPin} color="#8899AA" boxSize={3} /><Text color="#8899AA" fontSize="sm">{profile.country}</Text></HStack>}
          <HStack><Icon as={FiStar} color="#FF6B35" boxSize={3} /><Text color="#8899AA" fontSize="sm">{profile.rating} ({profile.totalReviews} reviews)</Text></HStack>
        </HStack>
        <SimpleGrid columns={3} gap={4} mb={4}>
          <Box><Text color="white" fontWeight="black" fontSize="xl">{profile.totalProjects}</Text><Text color="#8899AA" fontSize="xs">Projects</Text></Box>
          <Box><Text color="white" fontWeight="black" fontSize="xl">${profile.totalEarned}</Text><Text color="#8899AA" fontSize="xs">Earned</Text></Box>
          <Box><Text color="white" fontWeight="black" fontSize="xl">{profile.successRate}%</Text><Text color="#8899AA" fontSize="xs">Success</Text></Box>
        </SimpleGrid>
        {user?._id !== id && (
          <HStack justify="center" spacing={3}>
            <Button bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} leftIcon={<FiMessageSquare />} onClick={() => navigate('/chat')}>
              Contact / تواصل
            </Button>
          </HStack>
        )}
      </Box>

      <Tabs colorScheme="orange">
        <TabList borderColor="#2A4060" mb={4}>
          {['Bio', 'Skills', 'Reviews'].map(t => <Tab key={t} color="#8899AA" _selected={{ color: '#FF6B35', borderColor: '#FF6B35' }}>{t}</Tab>)}
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={5}>
              <Text color="#8899AA">{profile.bio || 'No bio yet'}</Text>
            </Box>
          </TabPanel>
          <TabPanel px={0}>
            <HStack flexWrap="wrap" spacing={2}>
              {profile.skills?.length > 0 ? profile.skills.map(s => (
                <Badge key={s} bg="#FF6B35" color="white" borderRadius="full" px={3} py={1}>{s}</Badge>
              )) : <Text color="#8899AA">No skills listed</Text>}
            </HStack>
          </TabPanel>
          <TabPanel px={0}>
            <VStack spacing={3} align="stretch">
              {reviews.length === 0 ? <Text color="#8899AA">No reviews yet</Text> : reviews.map(r => (
                <Box key={r._id} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl" p={4}>
                  <Flex justify="space-between" mb={2}>
                    <HStack>
                      <Avatar size="sm" name={r.reviewerId?.username} src={r.reviewerId?.profilePic} />
                      <Text color="white" fontSize="sm">{r.reviewerId?.username}</Text>
                    </HStack>
                    <HStack>{[...Array(5)].map((_, i) => <Icon key={i} as={FiStar} color={i < r.rating ? '#FF6B35' : '#2A4060'} boxSize={3} />)}</HStack>
                  </Flex>
                  <Text color="#8899AA" fontSize="sm">{r.comment}</Text>
                </Box>
              ))}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
