import { Package } from 'lucide-react'

export function ProductsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">商品管理</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-3 text-gray-400">
        <Package className="w-10 h-10" />
        <p className="text-sm">商品管理功能開發中</p>
      </div>
    </div>
  )
}
