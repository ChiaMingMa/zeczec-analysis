import { useAuth } from '../../contexts/AuthContext'
import { BarChart2 } from 'lucide-react'

export function DashboardPage() {
  const { profile } = useAuth()
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">業績總覽</h2>
      <p className="text-sm text-gray-500 mb-6">歡迎回來，{profile?.display_name}</p>
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-3 text-gray-400">
        <BarChart2 className="w-10 h-10" />
        <p className="text-sm">業績圖表開發中</p>
      </div>
    </div>
  )
}
