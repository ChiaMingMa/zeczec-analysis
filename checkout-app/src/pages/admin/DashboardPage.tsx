import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, ShoppingBag, Tag, Loader2, MapPin } from 'lucide-react'
import { fetchOrdersByDateRange, fetchLocations } from '../../lib/api'
import type { Location } from '../../types/database'

type Range = 'today' | 'week' | 'month'
type DashOrder = Awaited<ReturnType<typeof fetchOrdersByDateRange>>[number]

function getDateRange(range: Range): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date(now)
  if (range === 'today') {
    start.setHours(0, 0, 0, 0)
  } else if (range === 'week') {
    const day = start.getDay()
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  return { start: start.toISOString(), end: end.toISOString() }
}

const rangeLabels: Record<Range, string> = { today: '今天', week: '本週', month: '本月' }

export function DashboardPage() {
  const [range, setRange] = useState<Range>('today')
  const [orders, setOrders] = useState<DashOrder[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getDateRange(range)
    const [locs, ords] = await Promise.all([fetchLocations(), fetchOrdersByDateRange(start, end)])
    setLocations(locs)
    setOrders(ords)
    setLoading(false)
  }, [range])

  useEffect(() => { loadData() }, [loadData])

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const totalDiscount = orders.reduce((s, o) => s + o.discount_amount, 0)

  const statsByLocation = locations.map(loc => {
    const locOrders = orders.filter(o => o.location_id === loc.id)
    return { ...loc, revenue: locOrders.reduce((s, o) => s + o.total, 0), count: locOrders.length }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">業績總覽</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['today', 'week', 'month'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-indigo-600 font-medium mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> 總銷售額
              </p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-emerald-600 font-medium mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> 總訂單數
              </p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> 總折扣金額
              </p>
              <p className="text-2xl font-bold text-gray-900">${totalDiscount.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">各據點業績</span>
            </div>
            {statsByLocation.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">無據點資料</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {statsByLocation.map(loc => (
                  <div key={loc.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{loc.name}</p>
                      <p className="text-xs text-gray-400">{loc.count} 筆訂單</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">${loc.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">最近訂單</span>
            </div>
            {orders.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                {rangeLabels[range]}尚無訂單
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.slice(0, 30).map(order => (
                  <div key={order.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">
                        {order.location?.name ?? '—'} ·{' '}
                        {new Date(order.created_at).toLocaleString('zh-TW', {
                          month: 'numeric', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {order.discount_amount > 0 && (
                      <span className="text-xs text-amber-600">-${order.discount_amount.toLocaleString()}</span>
                    )}
                    <p className="font-bold text-gray-900">${order.total.toLocaleString()}</p>
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
