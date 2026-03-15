import { createContext, useState } from "react"

export const UserContext = createContext({})

const getInitialState = () => {
  const user = localStorage.getItem("fursa_user")
  return user ? JSON.parse(user) : null
}

export function UserContextProvider({ children }) {
  const [user, setUser] = useState(getInitialState)
  const [notifications, setNotifications] = useState([])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem("fursa_user", JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("fursa_user")
  }

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, notifications, setNotifications }}>
      {children}
    </UserContext.Provider>
  )
}
