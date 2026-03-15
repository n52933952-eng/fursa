import { Box, Flex, Text, VStack, HStack, Icon, Button, Badge, Divider, Spinner, Input, useToast, SimpleGrid } from '@chakra-ui/react'
import { FiDollarSign, FiArrowUpRight, FiArrowDownLeft, FiCreditCard } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    const fetch = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          axios.get('/api/wallet', { withCredentials: true }),
          axios.get('/api/wallet/transactions', { withCredentials: true })
        ])
        setWallet(walletRes.data)
        setTransactions(txRes.data)
      } catch {}
      setLoading(false)
    }
    fetch()
  }, [])

  const handleDeposit = async () => {
    try {
      await axios.post('/api/wallet/deposit', { amount: parseFloat(amount) }, { withCredentials: true })
      toast({ title: 'Deposit successful!', status: 'success', duration: 3000 })
      setAmount('')
    } catch {}
  }

  const handleWithdraw = async () => {
    try {
      await axios.post('/api/wallet/withdraw', { amount: parseFloat(amount) }, { withCredentials: true })
      toast({ title: 'Withdrawal successful!', status: 'success', duration: 3000 })
      setAmount('')
    } catch (err) {
      toast({ title: err.response?.data?.error, status: 'error', duration: 3000 })
    }
  }

  if (loading) return <Flex justify="center" py={20}><Spinner color="#FF6B35" size="xl" /></Flex>

  return (
    <Box maxW="900px" mx="auto">
      <Text color="white" fontSize="2xl" fontWeight="black" mb={6}>Wallet / المحفظة</Text>

      {/* Balance Card */}
      <Box bg="linear-gradient(135deg, #1E3555, #2A4060)" border="1px solid #2A4060" borderRadius="2xl" p={8} mb={6}>
        <Text color="#8899AA" fontSize="sm" mb={1}>Available Balance / الرصيد المتاح</Text>
        <Text color="white" fontSize="4xl" fontWeight="black" mb={4}>${wallet?.balance?.toFixed(2) || '0.00'}</Text>
        <SimpleGrid columns={2} gap={4}>
          <Box>
            <Text color="#8899AA" fontSize="xs">In Escrow / في الضمان</Text>
            <Text color="#FF6B35" fontWeight="bold">${wallet?.escrow?.toFixed(2) || '0.00'}</Text>
          </Box>
          <Box>
            <Text color="#8899AA" fontSize="xs">Total Earned / إجمالي الأرباح</Text>
            <Text color="#48BB78" fontWeight="bold">${wallet?.totalEarned?.toFixed(2) || '0.00'}</Text>
          </Box>
        </SimpleGrid>
      </Box>

      <Flex gap={4} mb={6}>
        {/* Deposit / Withdraw */}
        <Box flex={1} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}>
          <Text color="white" fontWeight="bold" mb={4}>Quick Actions / إجراءات سريعة</Text>
          <Input bg="#152438" border="1px solid #2A4060" color="white" placeholder="Amount ($)" type="number"
            value={amount} onChange={e => setAmount(e.target.value)} mb={3} borderRadius="lg" />
          <HStack>
            <Button flex={1} bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} leftIcon={<FiArrowDownLeft />} onClick={handleDeposit}>
              Deposit / إيداع
            </Button>
            <Button flex={1} variant="outline" borderColor="#2A4060" color="white" _hover={{ bg: '#1E3555' }} leftIcon={<FiArrowUpRight />} onClick={handleWithdraw}>
              Withdraw / سحب
            </Button>
          </HStack>
        </Box>

        {/* Payment Methods */}
        <Box flex={1} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}>
          <Text color="white" fontWeight="bold" mb={4}>Payment Methods / طرق الدفع</Text>
          <VStack spacing={3} align="stretch">
            {[{ name: 'Visa Card', icon: FiCreditCard, last4: '4567' }, { name: 'PayPal', icon: FiDollarSign }, { name: 'Zain Cash', icon: FiDollarSign }].map(m => (
              <Flex key={m.name} justify="space-between" align="center" p={3} bg="#152438" borderRadius="lg">
                <HStack><Icon as={m.icon} color="#FF6B35" /><Text color="white" fontSize="sm">{m.name}</Text></HStack>
                <Button size="xs" variant="outline" borderColor="#2A4060" color="#8899AA">Add</Button>
              </Flex>
            ))}
          </VStack>
        </Box>
      </Flex>

      {/* Transactions */}
      <Box bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}>
        <Text color="white" fontWeight="bold" mb={4}>Recent Transactions / المعاملات الأخيرة</Text>
        <VStack spacing={3} align="stretch">
          {transactions.length === 0 ? (
            <Text color="#8899AA" textAlign="center" py={4}>No transactions yet</Text>
          ) : transactions.map(tx => (
            <Flex key={tx._id} justify="space-between" align="center" p={3} bg="#152438" borderRadius="lg">
              <HStack>
                <Box p={2} bg={tx.type === 'deposit' || tx.type === 'release' ? '#48BB7822' : '#FC818122'} borderRadius="lg">
                  <Icon as={tx.type === 'deposit' || tx.type === 'release' ? FiArrowDownLeft : FiArrowUpRight}
                    color={tx.type === 'deposit' || tx.type === 'release' ? '#48BB78' : '#FC8181'} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text color="white" fontSize="sm">{tx.description || tx.type}</Text>
                  <Text color="#8899AA" fontSize="xs">{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </VStack>
              </HStack>
              <Text color={tx.type === 'deposit' || tx.type === 'release' ? '#48BB78' : '#FC8181'} fontWeight="bold">
                {tx.type === 'deposit' || tx.type === 'release' ? '+' : '-'}${tx.amount}
              </Text>
            </Flex>
          ))}
        </VStack>
      </Box>
    </Box>
  )
}
