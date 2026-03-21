import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  Button,
  Spinner,
  Input,
  useToast,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Select,
} from '@chakra-ui/react'
import { FiArrowUpRight, FiArrowDownLeft, FiCreditCard, FiTrash2 } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import axios from 'axios'

const BRAND_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  mada: 'Mada',
  amex: 'Amex',
  other: 'Card',
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [savedCards, setSavedCards] = useState([])
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingCard, setSavingCard] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [cardForm, setCardForm] = useState({
    nickname: '',
    holderName: '',
    brand: 'visa',
    last4: '',
    expiry: '',
  })
  const toast = useToast()

  const loadPaymentMethods = async () => {
    try {
      const { data } = await axios.get('/api/user/payment-methods', { withCredentials: true })
      setSavedCards(data.cards || [])
    } catch {
      setSavedCards([])
    }
  }

  useEffect(() => {
    const fetch = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          axios.get('/api/wallet', { withCredentials: true }),
          axios.get('/api/wallet/transactions', { withCredentials: true }),
        ])
        setWallet(walletRes.data)
        setTransactions(txRes.data)
      } catch {}
      await loadPaymentMethods()
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

  const handleAddCard = async () => {
    setSavingCard(true)
    try {
      const { data } = await axios.post(
        '/api/user/payment-methods',
        {
          nickname: cardForm.nickname,
          holderName: cardForm.holderName,
          brand: cardForm.brand,
          last4: cardForm.last4,
          expiry: cardForm.expiry,
        },
        { withCredentials: true }
      )
      setSavedCards(data.cards || [])
      toast({
        title: 'Card saved',
        description: 'We only store the last 4 digits for your reference.',
        status: 'success',
        duration: 4000,
      })
      setCardForm({ nickname: '', holderName: '', brand: 'visa', last4: '', expiry: '' })
      onClose()
    } catch (err) {
      toast({
        title: err.response?.data?.error || 'Could not save card',
        status: 'error',
        duration: 4000,
      })
    } finally {
      setSavingCard(false)
    }
  }

  const handleRemoveCard = async (cardId) => {
    try {
      const { data } = await axios.delete(`/api/user/payment-methods/${cardId}`, { withCredentials: true })
      setSavedCards(data.cards || [])
      toast({ title: 'Card removed', status: 'success', duration: 2000 })
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Remove failed', status: 'error', duration: 3000 })
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

        {/* Payment Methods — clients & freelancers */}
        <Box flex={1} bg="#1A2E4A" border="1px solid #2A4060" borderRadius="2xl" p={5}>
          <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
            <Text color="white" fontWeight="bold">Payment Methods / طرق الدفع</Text>
            <Button size="sm" bg="#FF6B35" color="white" _hover={{ bg: '#e55a25' }} leftIcon={<FiCreditCard />} onClick={onOpen}>
              Add card / إضافة بطاقة
            </Button>
          </Flex>
          <Text color="#8899AA" fontSize="xs" mb={4}>
            Save cardholder name & last 4 digits for your records. Never enter full card numbers here — use checkout for real payments.
            <br />
            احفظ اسم حامل البطاقة وآخر 4 أرقام فقط. لا تُدخل رقم البطاقة كاملاً هنا.
          </Text>
          <VStack spacing={3} align="stretch">
            {savedCards.length === 0 ? (
              <Text color="#8899AA" fontSize="sm" textAlign="center" py={2}>
                No saved cards yet. Tap &quot;Add card&quot; to add one.
              </Text>
            ) : (
              savedCards.map((c) => (
                <Flex key={c._id} justify="space-between" align="center" p={3} bg="#152438" borderRadius="lg" gap={2}>
                  <HStack align="start" spacing={3}>
                    <Icon as={FiCreditCard} color="#FF6B35" mt={1} />
                    <VStack align="start" spacing={0}>
                      <Text color="white" fontSize="sm" fontWeight="semibold">
                        {c.nickname || BRAND_LABELS[c.brand] || 'Card'} ·••• {c.last4}
                      </Text>
                      <Text color="#8899AA" fontSize="xs">
                        {c.holderName}
                        {c.expiry ? ` · ${c.expiry}` : ''}
                      </Text>
                    </VStack>
                  </HStack>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="#FC8181"
                    _hover={{ bg: 'rgba(252,129,129,0.12)' }}
                    leftIcon={<FiTrash2 />}
                    onClick={() => handleRemoveCard(c._id)}
                  >
                    Remove
                  </Button>
                </Flex>
              ))
            )}
          </VStack>
        </Box>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent bg="#1A2E4A" border="1px solid #2A4060" mx={3}>
          <ModalHeader color="white">Add card details / بيانات البطاقة</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel color="#8899AA" fontSize="sm">Label (optional) / اسم مختصر</FormLabel>
                <Input
                  bg="#152438"
                  borderColor="#2A4060"
                  color="white"
                  placeholder="e.g. Work card"
                  value={cardForm.nickname}
                  onChange={(e) => setCardForm((f) => ({ ...f, nickname: e.target.value }))}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel color="#8899AA" fontSize="sm">Name on card / الاسم على البطاقة</FormLabel>
                <Input
                  bg="#152438"
                  borderColor="#2A4060"
                  color="white"
                  placeholder="Full name"
                  value={cardForm.holderName}
                  onChange={(e) => setCardForm((f) => ({ ...f, holderName: e.target.value }))}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel color="#8899AA" fontSize="sm">Brand / النوع</FormLabel>
                <Select
                  bg="#152438"
                  borderColor="#2A4060"
                  color="white"
                  value={cardForm.brand}
                  onChange={(e) => setCardForm((f) => ({ ...f, brand: e.target.value }))}
                >
                  <option value="visa" style={{ background: '#152438' }}>Visa</option>
                  <option value="mastercard" style={{ background: '#152438' }}>Mastercard</option>
                  <option value="mada" style={{ background: '#152438' }}>Mada</option>
                  <option value="amex" style={{ background: '#152438' }}>Amex</option>
                  <option value="other" style={{ background: '#152438' }}>Other</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel color="#8899AA" fontSize="sm">Last 4 digits / آخر 4 أرقام</FormLabel>
                <Input
                  bg="#152438"
                  borderColor="#2A4060"
                  color="white"
                  placeholder="1234"
                  maxLength={4}
                  inputMode="numeric"
                  value={cardForm.last4}
                  onChange={(e) => setCardForm((f) => ({ ...f, last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel color="#8899AA" fontSize="sm">Expiry (MM/YY) — optional</FormLabel>
                <Input
                  bg="#152438"
                  borderColor="#2A4060"
                  color="white"
                  placeholder="12/28"
                  maxLength={5}
                  value={cardForm.expiry}
                  onChange={(e) => setCardForm((f) => ({ ...f, expiry: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="#8899AA" onClick={onClose}>Cancel</Button>
            <Button
              bg="#FF6B35"
              color="white"
              _hover={{ bg: '#e55a25' }}
              isLoading={savingCard}
              onClick={handleAddCard}
              isDisabled={!cardForm.holderName.trim() || cardForm.last4.length !== 4}
            >
              Save / حفظ
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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
