import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Tag, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchTodayOrders } from '../../lib/api'

type TodayOrder = Awaited<ReturnType<typeof fetchTodayOrders>>[number]

export function SummaryPage() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<TodayOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.location_id) { setLoading(false); return }
    fetchTodayOrders(profile.location_id)
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [profile?.location_id])

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalDiscount = orders.reduce((s, o) => s + o.discount_amount, 0)

  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-1">當日業績</h2>
      <p className="text-sm text-gray-500 mb-6">
        {profile?.location?.name ?? '—'} · {today}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-indigo-600 font-medium mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> 銷售金額
              </p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-emerald-600 font-medium mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> 訂單筆數
              </p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> 折扣金額
              </p>
              <p className="text-2xl font-bold text-gray-900">${totalDiscount.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">今日訂單</span>
            </div>
            {orders.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">今日尚無訂單</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map(order => (
                  <div key={order.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">
                        #{order.id.slice(0, 8).toUpperCase()}
                        <span className="ml-2 font-normal text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {(order as { staff?: { display_name: string } | null }).staff?.display_name && (
                          <span className="ml-2 text-gray-400">
                            · {(order as { staff?: { display_name: string } | null }).staff?.display_name}
                          </span>
                        )}
                      </p>
                      {order.discount_amount > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">折扣 -${order.discount_amount.toLocaleString()}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900">${order.total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
