import { Box, Flex, Text, Avatar, Input, Icon, VStack, HStack, Badge, Spinner } from '@chakra-ui/react'
import { FiSend, FiPaperclip } from 'react-icons/fi'
import { useEffect, useState, useContext, useRef } from 'react'
import { SocketContext } from '../context/SocketContext'
import { UserContext } from '../context/UserContext'
import axios from 'axios'

export default function Chat() {
  const { user } = useContext(UserContext)
  const { socket, onlineUsers } = useContext(SocketContext)
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef()

  useEffect(() => {
    axios.get('/api/message/conversations', { withCredentials: true })
      .then(res => setConversations(res.data))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    const other = selected.participants.find(p => p._id !== user._id)
    axios.get(`/api/message/${other._id}`, { withCredentials: true })
      .then(res => { setMessages(res.data); setLoading(false) })
  }, [selected])

  useEffect(() => {
    if (!socket) return
    socket.on('newMessage', msg => {
      if (selected) setMessages(prev => [...prev, msg])
    })
    return () => socket.off('newMessage')
  }, [socket, selected])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || !selected) return
    const other = selected.participants.find(p => p._id !== user._id)
    try {
      const { data } = await axios.post('/api/message', { recipientId: other._id, text }, { withCredentials: true })
      setMessages(prev => [...prev, data])
      setText('')
    } catch {}
  }

  const isOnline = (userId) => onlineUsers.some(u => u.userId === userId)

  return (
    <Flex h="calc(100vh - 140px)" gap={0} borderRadius="2xl" overflow="hidden" border="1px solid #2A4060">
      {/* Conversations */}
      <Box w="300px" bg="#1A2E4A" borderRight="1px solid #2A4060" overflowY="auto">
        <Box p={4} borderBottom="1px solid #2A4060">
          <Text color="white" fontWeight="bold">Messages / الرسائل</Text>
        </Box>
        {conversations.map(conv => {
          const other = conv.participants?.find(p => p._id !== user._id)
          return (
            <Flex key={conv._id} p={4} cursor="pointer" align="center" gap={3}
              bg={selected?._id === conv._id ? '#1E3555' : 'transparent'}
              _hover={{ bg: '#1E3555' }} onClick={() => setSelected(conv)}
              borderBottom="1px solid #2A4060">
              <Box position="relative">
                <Avatar size="sm" name={other?.username} src={other?.profilePic} />
                {isOnline(other?._id) && <Box position="absolute" bottom={0} right={0} w={3} h={3} bg="#48BB78" borderRadius="full" border="2px solid #1A2E4A" />}
              </Box>
              <VStack align="start" spacing={0} flex={1} overflow="hidden">
                <Text color="white" fontSize="sm" fontWeight="bold">{other?.username}</Text>
                <Text color="#8899AA" fontSize="xs" noOfLines={1}>{conv.lastMessage?.text || 'Start chatting...'}</Text>
              </VStack>
            </Flex>
          )
        })}
      </Box>

      {/* Messages */}
      <Flex flex={1} direction="column" bg="#152438">
        {!selected ? (
          <Flex flex={1} align="center" justify="center">
            <Text color="#8899AA">Select a conversation to start chatting</Text>
          </Flex>
        ) : (
          <>
            {/* Header */}
            {(() => {
              const other = selected.participants?.find(p => p._id !== user._id)
              return (
                <Flex p={4} align="center" gap={3} bg="#1A2E4A" borderBottom="1px solid #2A4060">
                  <Box position="relative">
                    <Avatar size="sm" name={other?.username} src={other?.profilePic} />
                    {isOnline(other?._id) && <Box position="absolute" bottom={0} right={0} w={3} h={3} bg="#48BB78" borderRadius="full" />}
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Text color="white" fontWeight="bold">{other?.username}</Text>
                    <Text color={isOnline(other?._id) ? '#48BB78' : '#8899AA'} fontSize="xs">{isOnline(other?._id) ? 'Online' : 'Offline'}</Text>
                  </VStack>
                </Flex>
              )
            })()}

            {/* Messages */}
            <Flex flex={1} direction="column" overflowY="auto" p={4} gap={3}>
              {loading ? <Flex justify="center"><Spinner color="#FF6B35" /></Flex> :
                messages.map(msg => (
                  <Flex key={msg._id} justify={msg.senderId === user._id ? 'flex-end' : 'flex-start'}>
                    <Box maxW="65%" bg={msg.senderId === user._id ? '#FF6B35' : '#1A2E4A'}
                      borderRadius={msg.senderId === user._id ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}
                      px={4} py={2}>
                      <Text color="white" fontSize="sm">{msg.text}</Text>
                      <Text color={msg.senderId === user._id ? 'whiteAlpha.700' : '#8899AA'} fontSize="10px" textAlign="right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              <div ref={messagesEndRef} />
            </Flex>

            {/* Input */}
            <Flex p={4} gap={3} bg="#1A2E4A" borderTop="1px solid #2A4060" align="center">
              <Icon as={FiPaperclip} color="#8899AA" boxSize={5} cursor="pointer" _hover={{ color: 'white' }} />
              <Input flex={1} bg="#152438" border="1px solid #2A4060" color="white" borderRadius="full"
                placeholder="Type a message... / اكتب رسالة" value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                _focus={{ border: '1px solid #FF6B35', boxShadow: 'none' }} />
              <Flex w={10} h={10} bg="#FF6B35" borderRadius="full" align="center" justify="center"
                cursor="pointer" _hover={{ bg: '#e55a25' }} onClick={sendMessage}>
                <Icon as={FiSend} color="white" boxSize={4} />
              </Flex>
            </Flex>
          </>
        )}
      </Flex>
    </Flex>
  )
}
