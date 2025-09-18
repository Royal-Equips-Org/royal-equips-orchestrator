// Test file to verify utilities are working correctly
import { cn } from './utils'

// Simple test to verify cn utility function
const testCn = () => {
  const result = cn('text-white', 'bg-black', undefined, 'font-mono')
  console.log('cn utility test result:', result)
  return result === 'bg-black text-white font-mono' // tailwind-merge should handle the order
}

export { testCn }