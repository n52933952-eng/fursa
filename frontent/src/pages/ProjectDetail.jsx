import { Box, Flex, Text, Badge, Button, VStack, HStack, Avatar, Icon, Textarea, Input, Spinner, useToast, Divider } from '@chakra-ui/react'
import { FiClock, FiDollarSign, FiStar, FiSend } from 'react-icons/fi'
import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
import axios from 'axios'

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useContext(UserContext)
  const [project, setProject] = useState(null)
  const [proposals, setProposals] = useState([])
  const [proposal, setProposal] = useState({ coverLetter: '', bid: '', deliveryTime: '' })
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const [projRes, propRes] = await Promise.all([
          axios.get(`/api/project/${id}`, { withCredentials: true }),
          axios.get(`/api/proposal/${id}`, { withCredentials: true })
        ])
        setProject(projRes.data)
        setProposals(propRes.data)
      } catch {}
      setLoading(false)
    }
    fetch()
  }, [id])

  const submitProposal = async () => {
    try {
      await axios.post('/api/proposal', { projectId: id, ...proposal }, { withCredentials: true })
      toast({ title: 'Proposal submitted! / تم تقديم العرض!', status: 'success', duration: 3000 })
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed', status: 'error', duration: 3000 })
    }
  }

  const acceptProposal = async (proposalId) => {
    try {
      await axios.put(`/api/proposal/accept/${proposalId}`, {}, { withCredentials: true })
      toast({ title: 'Proposal accepted! / تم قبول العرض!', status: 'success', duration: 3000 })
    } catch {}
  }

  if (loading) return <Flex justify="center" py={20}><Spinner color="#FF6B35" size="xl" /></Flex>
  if (!project) return <Text color="white">Project not found</Text>

  return (
    <Flex gap={6} align="start">
      {/* Project Details */}
      <Box flex={2}>
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6} mb={4}>
          <Flex justify="space-between" align="start" mb={4}>
            <Badge bg="#FF6B35" color="white" borderRadius="md" px={2}>{project.category}</Badge>
            <Badge colorScheme={project.status === 'open' ? 'green' : 'yellow'}>{project.status}</Badge>
          </Flex>
          <Text color="white" fontSize="xl" fontWeight="black" mb={3}>{project.title}</Text>
          <Text color="#8899AA" mb={4}>{project.description}</Text>

          <HStack spacing={6} mb={4}>
            <HStack><Icon as={FiDollarSign} color="#FF6B35" /><Text color="white" fontWeight="bold">${project.budget} ({project.budgetType})</Text></HStack>
            <HStack><Icon as={FiClock} color="#8899AA" /><Text color="#8899AA">{Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left</Text></HStack>
          </HStack>

          <HStack flexWrap="wrap" spacing={2}>
            {project.skills?.map(s => <Badge key={s} bg="#152438" color="#8899AA">{s}</Badge>)}
          </HStack>
        </Box>

        {/* Submit Proposal - Freelancers only */}
        {user?.role === 'freelancer' && project.status === 'open' && (
          <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6} mb={4}>
            <Text color="white" fontWeight="bold" mb={4}>Submit Proposal / قدم عرضك</Text>
            <VStack spacing={3}>
              <Textarea bg="#152438" border="1px solid #2A4060" color="white" placeholder="Cover letter..." rows={4}
                value={proposal.coverLetter} onChange={e => setProposal({ ...proposal, coverLetter: e.target.value })} />
              <HStack w="full">
                <Input bg="#152438" border="1px solid #2A4060" color="white" placeholder="Your bid ($)" type="number"
                  value={proposal.bid} onChange={e => setProposal({ ...proposal, bid: e.target.value })} />
                <Input bg="#152438" border="1px solid #2A4060" color="white" placeholder="Delivery (days)" type="number"
                  value={proposal.deliveryTime} onChange={e => setProposal({ ...proposal, deliveryTime: e.target.value })} />
              </HStack>
              <Button w="full" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} leftIcon={<FiSend />} onClick={submitProposal}>
                Submit Proposal / تقديم العرض
              </Button>
            </VStack>
          </Box>
        )}

        {/* Proposals List */}
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={6}>
          <Text color="white" fontWeight="bold" mb={4}>Proposals ({proposals.length}) / العروض</Text>
          <VStack spacing={3} align="stretch">
            {proposals.map(p => (
              <Box key={p._id} bg="#152438" borderRadius="xl" p={4}>
                <Flex justify="space-between" align="start">
                  <HStack>
                    <Avatar size="sm" name={p.freelancerId?.username} src={p.freelancerId?.profilePic} />
                    <VStack align="start" spacing={0}>
                      <Text color="white" fontSize="sm" fontWeight="bold">{p.freelancerId?.username}</Text>
                      <HStack><Icon as={FiStar} color="#FF6B35" boxSize={3} /><Text color="#8899AA" fontSize="xs">{p.freelancerId?.rating}</Text></HStack>
                    </VStack>
                  </HStack>
                  <VStack align="end" spacing={0}>
                    <Text color="#FF6B35" fontWeight="bold">${p.bid}</Text>
                    <Text color="#8899AA" fontSize="xs">{p.deliveryTime} days</Text>
                  </VStack>
                </Flex>
                <Text color="#8899AA" fontSize="sm" mt={2}>{p.coverLetter}</Text>
                {user?.role === 'client' && p.status === 'pending' && (
                  <Button size="sm" mt={2} bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} onClick={() => acceptProposal(p._id)}>
                    Accept / قبول
                  </Button>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      </Box>

      {/* Client Info */}
      <Box flex={1}>
        <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}>
          <Text color="white" fontWeight="bold" mb={3}>Client / العميل</Text>
          <VStack>
            <Avatar size="lg" name={project.clientId?.username} src={project.clientId?.profilePic} />
            <Text color="white" fontWeight="bold">{project.clientId?.username}</Text>
            <HStack><Icon as={FiStar} color="#FF6B35" /><Text color="#8899AA">{project.clientId?.rating}</Text></HStack>
            <Button w="full" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} size="sm"
              onClick={() => navigate(`/profile/${project.clientId?._id}`)}>
              View Profile
            </Button>
          </VStack>
        </Box>
      </Box>
    </Flex>
  )
}
