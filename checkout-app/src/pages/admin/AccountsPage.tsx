import { Users } from 'lucide-react'

export function AccountsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">帳號管理</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-3 text-gray-400">
        <Users className="w-10 h-10" />
        <p className="text-sm">帳號管理功能開發中</p>
      </div>
    </div>
  )
}
