import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, Loader2, Search, Tag } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../hooks/useCart'
import { fetchActiveProducts, fetchActivePromotions, createOrder } from '../../lib/api'
import type { Product, Promotion } from '../../types/database'

type Step = 'checkout' | 'confirm' | 'done'

export function CheckoutPage() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<Step>('checkout')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')

  const { items, summary, addItem, removeItem, updateQty, clearCart } = useCart(promotions)

  useEffect(() => {
    Promise.all([fetchActiveProducts(), fetchActivePromotions()])
      .then(([prods, promos]) => { setProducts(prods); setPromotions(promos) })
      .finally(() => setLoadingData(false))
  }, [])

  const categories = ['全部', ...Array.from(new Set(products.map(p => p.category ?? '其他').filter(Boolean)))]

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === '全部' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  async function handleConfirm() {
    if (!profile?.location_id || !profile?.id) return
    setSubmitting(true)
    try {
      const order = await createOrder(summary, profile.location_id, profile.id, note)
      setOrderId(order.id)
      setStep('done')
      clearCart()
    } catch (e) {
      alert('建立訂單失敗：' + (e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  // ── 完成畫面 ─────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 gap-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">結帳完成</h2>
          <p className="text-sm text-gray-500">訂單編號：{orderId?.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* LINE QR Code 區塊 */}
        <div className="bg-green-50 border border-green-200 rounded-2xl px-8 py-6 max-w-xs w-full">
          <p className="text-sm font-medium text-gray-700 mb-3">加入 LINE 好友，享會員專屬優惠</p>
          <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center border border-gray-200 text-xs text-gray-400">
            LINE QR Code<br/>（待設定）
          </div>
        </div>

        <button
          onClick={() => { setStep('checkout'); setNote(''); setOrderId(null) }}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          開始新的結帳
        </button>
      </div>
    )
  }

  // ── 確認畫面 ─────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">確認訂單</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          {summary.items.map(item => (
            <div key={item.product.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <img src={item.product.image_url} alt={item.product.name}
                className="w-12 h-12 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                <p className="text-xs text-gray-400">×{item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                ${(item.product.price * item.quantity).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* 折扣明細 */}
        {summary.discounts.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3 mb-4 space-y-1">
            {summary.discounts.map(d => (
              <div key={d.promotion_id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <Tag className="w-3.5 h-3.5" />{d.name}
                </span>
                <span className="text-amber-700 font-medium">-${d.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* 金額總計 */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>小計</span><span>${summary.subtotal.toLocaleString()}</span>
          </div>
          {summary.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>折扣</span><span>-${summary.discount_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>應付金額</span><span className="text-indigo-600">${summary.total.toLocaleString()}</span>
          </div>
        </div>

        {/* 備註 */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="備註（選填）"
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={() => setStep('checkout')}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            返回修改
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? '處理中…' : '確認結帳'}
          </button>
        </div>
      </div>
    )
  }

  // ── 主結帳畫面 ───────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* 商品區 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 搜尋 + 分類 */}
        <div className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋商品…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 商品格 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">找不到商品</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map(p => {
                const inCart = items.find(i => i.product.id === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className={`relative bg-white rounded-xl border text-left transition-all hover:shadow-md active:scale-95 ${
                      inCart ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="aspect-square overflow-hidden rounded-t-xl bg-gray-50">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
                      <p className="text-sm font-bold text-indigo-600 mt-1">${p.price.toLocaleString()}</p>
                      {p.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</p>}
                    </div>
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 購物車 */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-sm text-gray-900">購物車</span>
          {items.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{items.length} 項商品</span>
          )}
        </div>

        {/* 購物車商品 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">點選商品加入購物車</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start gap-2 mb-2">
                  <img src={item.product.image_url} alt={item.product.name}
                    className="w-9 h-9 rounded-md object-cover flex-shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{item.product.name}</p>
                    <p className="text-xs text-indigo-600 font-semibold mt-0.5">${item.product.price.toLocaleString()}</p>
                  </div>
                  <button onClick={() => removeItem(item.product.id)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-gray-800">${(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 促銷折扣 */}
        {summary.discounts.length > 0 && (
          <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
            {summary.discounts.map(d => (
              <div key={d.promotion_id} className="flex justify-between text-xs text-amber-700 py-0.5">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{d.name}</span>
                <span>-${d.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* 金額 + 結帳按鈕 */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>小計</span><span>${summary.subtotal.toLocaleString()}</span>
          </div>
          {summary.discount_amount > 0 && (
            <div className="flex justify-between text-xs text-amber-600">
              <span>折扣</span><span>-${summary.discount_amount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>合計</span>
            <span className="text-indigo-600 text-base">${summary.total.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setStep('confirm')}
            disabled={items.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            前往結帳
          </button>
        </div>
      </div>
    </div>
  )
}
