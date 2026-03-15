import { Box, Flex, VStack, Text, Input, Button, FormControl, FormLabel, useToast, Icon, IconButton } from '@chakra-ui/react'
import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { UserContext } from '../context/UserContext'
import FursaLogo from '../components/FursaLogo'
import axios from 'axios'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useContext(UserContext)
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/login', form, { withCredentials: true })
      login(data)
      navigate('/')
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Login failed', status: 'error', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" w="100vw" align="center" justify="center" bg="#152438" px={4}>
      <Box bg="#1A2E4A" p={{ base: 6, md: 8 }} borderRadius="2xl" w="full" maxW="420px" border="1px solid #2A4060">
        {/* Logo */}
        <VStack mb={8} align="center">
          <FursaLogo size="md" variant="light" />
          <Text color="#8899AA" fontSize="sm" mt={1}>Admin Portal / بوابة المشرف</Text>
        </VStack>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel color="#8899AA" fontSize="sm">Email / البريد الإلكتروني</FormLabel>
              <Flex align="center" bg="#152438" border="1px solid #2A4060" borderRadius="lg" px={3}>
                <Icon as={FiMail} color="#8899AA" mr={2} flexShrink={0} />
                <Input
                  variant="unstyled" color="white" placeholder="Enter your email"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  py={3}
                />
              </Flex>
            </FormControl>

            <FormControl>
              <FormLabel color="#8899AA" fontSize="sm">Password / كلمة المرور</FormLabel>
              <Flex align="center" bg="#152438" border="1px solid #2A4060" borderRadius="lg" px={3}>
                <Icon as={FiLock} color="#8899AA" mr={2} flexShrink={0} />
                <Input
                  variant="unstyled" color="white" placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  py={3}
                />
                <IconButton
                  icon={<Icon as={showPassword ? FiEyeOff : FiEye} />}
                  variant="unstyled" size="sm" color="#8899AA"
                  _hover={{ color: 'white' }}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label="Toggle password"
                  minW="auto"
                />
              </Flex>
            </FormControl>


            <Button type="submit" w="full" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }}
              borderRadius="lg" py={6} isLoading={loading}>
              Sign In / تسجيل الدخول
            </Button>

            <Text color="#4A6080" fontSize="xs" textAlign="center" pt={1}>
              This portal is for administrators only
            </Text>
          </VStack>
        </form>
      </Box>
    </Flex>
  )
}
