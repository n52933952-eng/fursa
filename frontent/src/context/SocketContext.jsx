import { createContext, useEffect, useState, useContext } from 'react'
import io from 'socket.io-client'
import { UserContext } from './UserContext'

export const SocketContext = createContext()

export function SocketContextProvider({ children }) {
  const { user, setNotifications } = useContext(UserContext)
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!user?._id) return

    const serverUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:5000'
    const newSocket = io(serverUrl, {
      query: { userId: user._id, role: user.role }
    })

    setSocket(newSocket)

    newSocket.on('getOnlineUsers', (users) => setOnlineUsers(users))

    newSocket.on('newNotification', (notification) => {
      setNotifications(prev => [notification, ...prev])
    })

    return () => newSocket.close()
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  )
}
