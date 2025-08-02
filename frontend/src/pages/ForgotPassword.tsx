import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  HStack,
} from '@chakra-ui/react'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const toast = useToast()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await resetPassword(email)

      if (error) {
        toast({
          title: 'Password reset failed',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } else {
        setSent(true)
        toast({
          title: 'Password reset email sent',
          description: 'Check your email for password reset instructions',
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
      }
    } catch (error) {
      toast({
        title: 'Password reset failed',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Box
          bg="white"
          p={8}
          borderRadius="lg"
          boxShadow="lg"
          w="full"
          maxW="md"
          mx={4}
        >
          <VStack spacing={6}>
            <Heading size="lg" color="purple.600">
              Check your email
            </Heading>
            <Text color="gray.600" textAlign="center">
              We've sent password reset instructions to <strong>{email}</strong>
            </Text>
            <Text color="gray.500" fontSize="sm" textAlign="center">
              If you don't see the email, check your spam folder. The link will expire in 1 hour.
            </Text>
            <Link to="/login">
              <Button colorScheme="purple" w="full">
                Back to Login
              </Button>
            </Link>
          </VStack>
        </Box>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Box
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        w="full"
        maxW="md"
        mx={4}
      >
        <VStack spacing={6}>
          <Heading size="lg" color="purple.600">
            Reset your password
          </Heading>
          <Text color="gray.600" textAlign="center">
            Enter your email address and we'll send you a link to reset your password
          </Text>

          <form onSubmit={handleResetPassword} style={{ width: '100%' }}>
            <VStack spacing={4} w="full">
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="purple"
                w="full"
                size="lg"
                isLoading={loading}
                loadingText="Sending..."
              >
                Send Reset Link
              </Button>
            </VStack>
          </form>

          <HStack spacing={2} pt={4}>
            <Text color="gray.600">Remember your password?</Text>
            <Link to="/login">
              <Text color="purple.600" fontWeight="medium">
                Sign in
              </Text>
            </Link>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}

export default ForgotPassword
