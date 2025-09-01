import dynamic from 'next/dynamic'

// Dynamically import the main app component to avoid hydration issues
const Dashboard = dynamic(() => import('./components/Dashboard'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
})

export default function Home() {
  return <Dashboard />
}