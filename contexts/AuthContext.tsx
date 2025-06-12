// contexts/AuthContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { createToken } from '@/lib/auth'
import { User, Session } from '@supabase/supabase-js'
import { toast } from 'sonner'

interface AuthUser {
  id: string
  email: string
  name?: string
  created_at: string
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (data: { name?: string; email?: string }) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão inicial
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erro ao obter sessão:', error)
          return
        }

        if (session) {
          setSession(session)
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email,
            created_at: session.user.created_at
          })

          // Salvar token JWT personalizado
          const customToken = createToken({
            userId: session.user.id,
            email: session.user.email!
          })
          localStorage.setItem('auth_token', customToken)
        }
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        if (session) {
          setSession(session)
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email,
            created_at: session.user.created_at
          })

          // Salvar token JWT personalizado
          const customToken = createToken({
            userId: session.user.id,
            email: session.user.email!
          })
          localStorage.setItem('auth_token', customToken)
        } else {
          setSession(null)
          setUser(null)
          localStorage.removeItem('auth_token')
        }

        if (event === 'SIGNED_OUT') {
          setIsLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Erro no login:', error)
        return { 
          success: false, 
          error: getErrorMessage(error.message) 
        }
      }

      if (data.user) {
        toast.success('Login realizado com sucesso!')
        return { success: true }
      }

      return { success: false, error: 'Erro desconhecido no login' }
    } catch (error) {
      console.error('Erro no login:', error)
      return { 
        success: false, 
        error: 'Erro interno. Tente novamente.' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0]
          }
        }
      })

      if (error) {
        console.error('Erro no registro:', error)
        return { 
          success: false, 
          error: getErrorMessage(error.message) 
        }
      }

      if (data.user) {
        toast.success('Conta criada com sucesso! Verifique seu email.')
        return { success: true }
      }

      return { success: false, error: 'Erro desconhecido no registro' }
    } catch (error) {
      console.error('Erro no registro:', error)
      return { 
        success: false, 
        error: 'Erro interno. Tente novamente.' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Erro no logout:', error)
        toast.error('Erro ao fazer logout')
        return
      }

      // Limpar storage local
      localStorage.removeItem('auth_token')
      localStorage.removeItem('jira-extractor-config')
      
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      console.error('Erro no logout:', error)
      toast.error('Erro ao fazer logout')
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        console.error('Erro ao resetar senha:', error)
        return { 
          success: false, 
          error: getErrorMessage(error.message) 
        }
      }

      toast.success('Email de recuperação enviado!')
      return { success: true }
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      return { 
        success: false, 
        error: 'Erro interno. Tente novamente.' 
      }
    }
  }

  const updateProfile = async (data: { name?: string; email?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: data.email,
        data: {
          name: data.name
        }
      })

      if (error) {
        console.error('Erro ao atualizar perfil:', error)
        return { 
          success: false, 
          error: getErrorMessage(error.message) 
        }
      }

      toast.success('Perfil atualizado com sucesso!')
      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return { 
        success: false, 
        error: 'Erro interno. Tente novamente.' 
      }
    }
  }

  // Função para traduzir mensagens de erro
  const getErrorMessage = (error: string): string => {
    const errorMessages: Record<string, string> = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
      'User already registered': 'Usuário já cadastrado',
      'Invalid email': 'Email inválido',
      'Signup requires a valid password': 'Senha inválida',
      'Email rate limit exceeded': 'Muitas tentativas. Tente novamente mais tarde.',
      'Invalid refresh token': 'Sessão expirada. Faça login novamente.'
    }

    return errorMessages[error] || 'Erro desconhecido. Tente novamente.'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}