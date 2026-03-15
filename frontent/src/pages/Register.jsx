import { Box, Flex, VStack, Text, Input, Button, FormControl, FormLabel, SimpleGrid, useToast, Icon } from '@chakra-ui/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiBriefcase, FiMonitor } from 'react-icons/fi'
import axios from 'axios'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'client' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/auth/signup', form)
      toast({ title: 'Account created! Please login.', status: 'success', duration: 3000 })
      navigate('/login')
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Signup failed', status: 'error', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" w="100vw" align="center" justify="center" bg="#152438">
      <Box bg="#1A2E4A" p={8} borderRadius="2xl" w="full" maxW="460px" border="1px solid #2A4060">
        <VStack mb={6}>
          <Flex align="center" gap={2}>
            <Box w={10} h={10} bg="#FF6B35" borderRadius="lg" display="flex" alignItems="center" justifyContent="center">
              <Text fontWeight="black" color="white" fontSize="xl">F</Text>
            </Box>
            <Text fontWeight="black" fontSize="2xl" color="white">Fursa فرصة</Text>
          </Flex>
          <Text color="#8899AA" fontSize="sm">Create Account / إنشاء حساب</Text>
        </VStack>

        {/* Role Selection */}
        <SimpleGrid columns={2} gap={3} mb={6}>
          {['client', 'freelancer'].map(role => (
            <Box
              key={role} p={4} borderRadius="xl" cursor="pointer" textAlign="center"
              border={form.role === role ? '2px solid #FF6B35' : '1px solid #2A4060'}
              bg={form.role === role ? '#1E3555' : 'transparent'}
              onClick={() => setForm({ ...form, role })}
            >
              <Icon as={role === 'client' ? FiBriefcase : FiMonitor}
                boxSize={6} color={form.role === role ? '#FF6B35' : '#8899AA'} mb={2} />
              <Text color={form.role === role ? 'white' : '#8899AA'} fontWeight="bold" fontSize="sm">
                {role === 'client' ? 'Client / عميل' : 'Freelancer / مستقل'}
              </Text>
              <Text color="#8899AA" fontSize="xs">
                {role === 'client' ? 'Post projects & hire' : 'Offer services & earn'}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            {[
              { label: 'Username / اسم المستخدم', key: 'username', type: 'text' },
              { label: 'Email / البريد الإلكتروني', key: 'email', type: 'email' },
              { label: 'Password / كلمة المرور', key: 'password', type: 'password' },
            ].map(({ label, key, type }) => (
              <FormControl key={key}>
                <FormLabel color="#8899AA" fontSize="sm">{label}</FormLabel>
                <Input
                  type={type} bg="#152438" border="1px solid #2A4060" color="white"
                  _hover={{ border: '1px solid #FF6B35' }} _focus={{ border: '1px solid #FF6B35', boxShadow: 'none' }}
                  borderRadius="lg" value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                />
              </FormControl>
            ))}

            <Button type="submit" w="full" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }}
              borderRadius="lg" py={6} isLoading={loading}>
              Create Account / إنشاء حساب
            </Button>

            <Text color="#8899AA" fontSize="sm">
              Already have an account?{' '}
              <Text as="span" color="#FF6B35"><Link to="/login">Sign In</Link></Text>
            </Text>
          </VStack>
        </form>
      </Box>
    </Flex>
  )
}
