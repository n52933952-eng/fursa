import {
  Box, Flex, Text, Avatar, Input, Icon, VStack, HStack, Badge, Spinner,
  IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, useDisclosure, Divider, useBreakpointValue,
} from '@chakra-ui/react'
import { FiSend, FiPlus, FiUser, FiMail, FiHash, FiTrash2 } from 'react-icons/fi'
import { useEffect, useState, useContext, useRef, useCallback, useMemo } from 'react'
import { SocketContext } from '../../context/SocketContext'
import { UserContext } from '../../context/UserContext'
import axios from 'axios'

function roleColor(role) {
  if (role === 'client') return { bg: 'rgba(72,187,120,0.2)', color: '#48BB78' }
  if (role === 'freelancer') return { bg: 'rgba(66,153,225,0.2)', color: '#4299E1' }
  return { bg: 'rgba(159,122,234,0.2)', color: '#9F7AEA' }
}

function formatConvTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yday = new Date(now)
  yday.setDate(yday.getDate() - 1)
  if (d.toDateString() === yday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function AdminConversations() {
  const { user } = useContext(UserContext)
  const { socket, onlineUsers } = useContext(SocketContext)
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [pendingOther, setPendingOther] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [allUsers, setAllUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const messagesEndRef = useRef()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const showProfile = useBreakpointValue({ base: false, xl: true })

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/message/conversations', { withCredentials: true })
      setConversations(Array.isArray(data) ? data : [])
    } catch {
      setConversations([])
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const otherParticipant = (conv) =>
    conv?.participants?.find((p) => String(p._id) !== String(user?._id))

  const activeOther = useMemo(() => {
    if (pendingOther) return pendingOther
    if (selected) return otherParticipant(selected)
    return null
  }, [pendingOther, selected, user?._id])

  const loadMessages = useCallback(
    async (conv) => {
      const other = otherParticipant(conv)
      if (!other?._id) return
      setLoadingMsgs(true)
      try {
        const { data } = await axios.get(`/api/message/${other._id}`, { withCredentials: true })
        setMessages(Array.isArray(data) ? data : [])
      } catch {
        setMessages([])
      }
      setLoadingMsgs(false)
    },
    [user?._id]
  )

  useEffect(() => {
    if (selected) {
      setPendingOther(null)
      loadMessages(selected)
    } else if (!pendingOther) {
      setMessages([])
    }
  }, [selected, loadMessages, pendingOther])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!socket) return
    const onNew = (msg) => {
      if (selected && String(msg.conversationId) === String(selected._id)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev
          return [...prev, msg]
        })
      }
      fetchConversations()
    }
    const onDeleted = (p) => {
      if (p?.messageId) {
        setMessages((prev) => prev.filter((m) => String(m._id) !== String(p.messageId)))
      }
      fetchConversations()
    }
    socket.on('newMessage', onNew)
    socket.on('messageDeleted', onDeleted)
    return () => {
      socket.off('newMessage', onNew)
      socket.off('messageDeleted', onDeleted)
    }
  }, [socket, selected, fetchConversations])

  const isOnline = (userId) => onlineUsers?.some((u) => String(u.userId) === String(userId))

  const sendMessage = async () => {
    const t = text.trim()
    if (!t) return
    const rid = activeOther?._id
    if (!rid) return
    try {
      const { data } = await axios.post(
        '/api/message',
        { recipientId: rid, text: t },
        { withCredentials: true }
      )
      setText('')
      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(data._id))) return prev
        return [...prev, data]
      })
      if (pendingOther) {
        setPendingOther(null)
        await fetchConversations()
        const { data: convs } = await axios.get('/api/message/conversations', { withCredentials: true })
        const list = Array.isArray(convs) ? convs : []
        setConversations(list)
        const match = list.find((c) =>
          c.participants?.some((p) => String(p._id) === String(rid))
        )
        if (match) setSelected(match)
      } else {
        fetchConversations()
      }
    } catch {}
  }

  const openNewModal = async () => {
    setUserSearch('')
    try {
      const { data } = await axios.get('/api/admin/users', { withCredentials: true })
      setAllUsers(Array.isArray(data) ? data.filter((u) => u.role !== 'admin') : [])
    } catch {
      setAllUsers([])
    }
    onOpen()
  }

  const pickUser = (u) => {
    setSelected(null)
    setPendingOther(u)
    setMessages([])
    onClose()
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        String(u._id).toLowerCase().includes(q)
    )
  }, [allUsers, userSearch])

  const selectConversation = (conv) => {
    setPendingOther(null)
    setSelected(conv)
  }

  const deleteMessage = async (msgId) => {
    if (!msgId) return
    try {
      await axios.delete(`/api/message/by-id/${msgId}`, { withCredentials: true })
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(msgId)))
    } catch {
      /* noop */
    }
  }

  return (
    <Flex
      direction="column"
      h={{ base: 'auto', lg: 'calc(100vh - 120px)' }}
      minH={{ base: '520px', lg: 'calc(100vh - 120px)' }}
      maxH={{ base: 'none', lg: 'calc(100vh - 120px)' }}
      borderRadius="2xl"
      overflow="hidden"
      border="1px solid #2A4060"
      bg="#152438"
    >
      <Flex flex={1} minH={0} direction={{ base: 'column', lg: 'row' }}>
        {/* —— Conversation list —— */}
        <Box
          w={{ base: '100%', lg: '280px', xl: '300px' }}
          minW={{ lg: '260px' }}
          bg="#1A2E4A"
          borderRight={{ lg: '1px solid #2A4060' }}
          borderBottom={{ base: '1px solid #2A4060', lg: 'none' }}
          display="flex"
          flexDirection="column"
          maxH={{ base: '240px', lg: 'none' }}
        >
          <Flex p={4} borderBottom="1px solid #2A4060" align="center" justify="space-between" flexShrink={0}>
            <Text color="white" fontWeight="bold" fontSize="md">
              Conversations / المحادثات
            </Text>
            <IconButton
              aria-label="New conversation"
              icon={<Icon as={FiPlus} />}
              size="sm"
              variant="ghost"
              color="#FF6B35"
              _hover={{ bg: 'rgba(255,107,53,0.15)' }}
              onClick={openNewModal}
            />
          </Flex>
          <Box flex={1} overflowY="auto">
            {loadingConvs ? (
              <Flex justify="center" py={8}>
                <Spinner color="#FF6B35" />
              </Flex>
            ) : (
              conversations.map((conv) => {
                const other = otherParticipant(conv)
                const active =
                  selected?._id === conv._id ||
                  (pendingOther && String(pendingOther._id) === String(other?._id))
                return (
                  <Flex
                    key={conv._id}
                    p={4}
                    cursor="pointer"
                    align="center"
                    gap={3}
                    bg={active ? '#1E3555' : 'transparent'}
                    _hover={{ bg: '#1E3555' }}
                    borderBottom="1px solid #2A4060"
                    onClick={() => selectConversation(conv)}
                  >
                    <Avatar size="sm" name={other?.username} src={other?.profilePic} />
                    <VStack align="start" spacing={0} flex={1} minW={0}>
                      <HStack w="100%" justify="space-between">
                        <Text color="white" fontSize="sm" fontWeight="bold" noOfLines={1}>
                          {other?.username || 'User'}
                        </Text>
                        <Text color="#4A6080" fontSize="10px" flexShrink={0}>
                          {formatConvTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                        </Text>
                      </HStack>
                      <HStack spacing={2} w="100%">
                        {other?.role && (
                          <Badge fontSize="9px" px={1.5} {...roleColor(other.role)}>
                            {other.role}
                          </Badge>
                        )}
                        <Text color="#8899AA" fontSize="xs" noOfLines={1} flex={1}>
                          {conv.lastMessage?.text || '—'}
                        </Text>
                      </HStack>
                    </VStack>
                  </Flex>
                )
              })
            )}
            {!loadingConvs && conversations.length === 0 && (
              <Text color="#4A6080" fontSize="sm" p={4} textAlign="center">
                No chats yet. Tap + to message a user.
              </Text>
            )}
          </Box>
        </Box>

        {/* —— Chat thread —— */}
        <Flex flex={1} direction="column" minW={0} bg="#152438">
          {!activeOther ? (
            <Flex flex={1} align="center" justify="center" minH="200px">
              <Text color="#4A6080">Select a conversation or start a new one</Text>
            </Flex>
          ) : (
            <>
              <Flex
                p={4}
                align="center"
                gap={3}
                bg="#1A2E4A"
                borderBottom="1px solid #2A4060"
                flexShrink={0}
              >
                <Avatar size="sm" name={activeOther.username} src={activeOther.profilePic} />
                <VStack align="start" spacing={0} flex={1}>
                  <HStack>
                    <Text color="white" fontWeight="bold">
                      {activeOther.username}
                    </Text>
                    {activeOther.role && (
                      <Badge fontSize="xs" {...roleColor(activeOther.role)}>
                        {activeOther.role}
                      </Badge>
                    )}
                  </HStack>
                  <Text color={isOnline(activeOther._id) ? '#48BB78' : '#8899AA'} fontSize="xs">
                    {isOnline(activeOther._id) ? 'Online' : 'Offline'}
                  </Text>
                </VStack>
              </Flex>

              <Flex flex={1} direction="column" overflowY="auto" p={4} gap={3} minH={0}>
                {loadingMsgs ? (
                  <Flex justify="center" py={6}>
                    <Spinner color="#FF6B35" />
                  </Flex>
                ) : (
                  messages.map((msg) => (
                    <Flex
                      key={msg._id}
                      justify={String(msg.senderId) === String(user._id) ? 'flex-end' : 'flex-start'}
                      align="flex-end"
                      gap={2}
                    >
                      {String(msg.senderId) !== String(user._id) && (
                        <IconButton
                          aria-label="Delete message"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          color="#8899AA"
                          _hover={{ color: '#FC8181', bg: 'rgba(252,129,129,0.12)' }}
                          flexShrink={0}
                          onClick={() => {
                            if (window.confirm('Remove this message for everyone in the chat?')) {
                              deleteMessage(msg._id)
                            }
                          }}
                        />
                      )}
                      <Box
                        maxW="70%"
                        bg={String(msg.senderId) === String(user._id) ? '#FF6B35' : '#1A2E4A'}
                        borderRadius={
                          String(msg.senderId) === String(user._id)
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px'
                        }
                        px={4}
                        py={2}
                        borderWidth={String(msg.senderId) === String(user._id) ? 0 : 1}
                        borderColor="#2A4060"
                      >
                        <Text color="white" fontSize="sm">
                          {msg.text}
                        </Text>
                        <Text
                          color={String(msg.senderId) === String(user._id) ? 'whiteAlpha.700' : '#8899AA'}
                          fontSize="10px"
                          textAlign="right"
                          mt={1}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </Box>
                      {String(msg.senderId) === String(user._id) && (
                        <IconButton
                          aria-label="Delete message"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          color="#8899AA"
                          _hover={{ color: '#FC8181', bg: 'rgba(252,129,129,0.12)' }}
                          flexShrink={0}
                          onClick={() => {
                            if (window.confirm('Remove this message for everyone in the chat?')) {
                              deleteMessage(msg._id)
                            }
                          }}
                        />
                      )}
                    </Flex>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Flex>

              <Flex p={4} gap={3} bg="#1A2E4A" borderTop="1px solid #2A4060" align="center" flexShrink={0}>
                <Input
                  flex={1}
                  bg="#152438"
                  border="1px solid #2A4060"
                  color="white"
                  borderRadius="full"
                  placeholder="Type a message… / اكتب رسالة"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  _focus={{ borderColor: '#FF6B35', boxShadow: 'none' }}
                />
                <Flex
                  w={10}
                  h={10}
                  bg="#FF6B35"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  cursor="pointer"
                  _hover={{ bg: '#e55a25' }}
                  onClick={sendMessage}
                >
                  <Icon as={FiSend} color="white" boxSize={4} />
                </Flex>
              </Flex>
            </>
          )}
        </Flex>

        {/* —— Profile sidebar (desktop) —— */}
        {showProfile && (
          <Box
            w="260px"
            flexShrink={0}
            bg="#1A2E4A"
            borderLeft="1px solid #2A4060"
            p={4}
            overflowY="auto"
            display={{ base: 'none', xl: 'block' }}
          >
            <Text color="white" fontWeight="bold" mb={4} fontSize="sm">
              Profile / الملف
            </Text>
            {!activeOther ? (
              <Text color="#4A6080" fontSize="sm">
                Select a user
              </Text>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Flex justify="center">
                  <Avatar size="xl" name={activeOther.username} src={activeOther.profilePic} />
                </Flex>
                <Text color="white" fontWeight="bold" textAlign="center">
                  {activeOther.username}
                </Text>
                {activeOther.role && (
                  <Flex justify="center">
                    <Badge fontSize="sm" px={3} py={1} {...roleColor(activeOther.role)}>
                      {activeOther.role}
                    </Badge>
                  </Flex>
                )}
                <Divider borderColor="#2A4060" />
                <HStack align="start" color="#8899AA" fontSize="xs">
                  <Icon as={FiHash} mt={0.5} />
                  <Box>
                    <Text color="#4A6080" fontWeight="600">
                      User ID
                    </Text>
                    <Text color="white" wordBreak="break-all" fontFamily="mono">
                      {activeOther._id}
                    </Text>
                  </Box>
                </HStack>
                <HStack align="start" color="#8899AA" fontSize="xs">
                  <Icon as={FiMail} mt={0.5} />
                  <Box>
                    <Text color="#4A6080" fontWeight="600">
                      Email
                    </Text>
                    <Text color="white" wordBreak="break-all">
                      {activeOther.email || '—'}
                    </Text>
                  </Box>
                </HStack>
                <HStack align="start" color="#8899AA" fontSize="xs">
                  <Icon as={FiUser} mt={0.5} />
                  <Box>
                    <Text color="#4A6080" fontWeight="600">
                      Rating
                    </Text>
                    <Text color="white">{activeOther.rating != null ? activeOther.rating : '—'}</Text>
                  </Box>
                </HStack>
                {activeOther.isBanned && (
                  <Badge colorScheme="red" alignSelf="center">
                    Banned
                  </Badge>
                )}
              </VStack>
            )}
          </Box>
        )}
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay bg="rgba(0,0,0,0.75)" />
        <ModalContent bg="#1A2E4A" border="1px solid #2A4060" borderRadius="xl">
          <ModalHeader color="white">Message user / مراسلة مستخدم</ModalHeader>
          <ModalCloseButton color="#8899AA" />
          <ModalBody pb={6}>
            <Input
              placeholder="Search name, email, or ID…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              mb={4}
              bg="#152438"
              borderColor="#2A4060"
              color="white"
              _focus={{ borderColor: '#FF6B35' }}
            />
            <Box maxH="320px" overflowY="auto">
              {filteredUsers.map((u) => (
                <Flex
                  key={u._id}
                  p={3}
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: '#1E3555' }}
                  align="center"
                  gap={3}
                  onClick={() => pickUser(u)}
                  mb={1}
                >
                  <Avatar size="sm" name={u.username} src={u.profilePic} />
                  <Box flex={1} minW={0}>
                    <Text color="white" fontWeight="600" fontSize="sm" noOfLines={1}>
                      {u.username}
                    </Text>
                    <Text color="#8899AA" fontSize="xs" noOfLines={1}>
                      {u.email}
                    </Text>
                  </Box>
                  <Badge fontSize="xs" {...roleColor(u.role)}>
                    {u.role}
                  </Badge>
                </Flex>
              ))}
            </Box>
            {filteredUsers.length === 0 && (
              <Text color="#4A6080" fontSize="sm" textAlign="center" py={4}>
                No users match
              </Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  )
}
