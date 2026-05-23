import { useState, useEffect } from 'react'
import { Tag, Plus, Edit2, Trash2, Loader2, Calendar } from 'lucide-react'
import {
  fetchAllPromotions, upsertPromotion, togglePromotionActive,
  deletePromotion, fetchActiveProducts,
} from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { Promotion, PromotionType, Product } from '../../types/database'

// ── Promotion type metadata ───────────────────────────────────

const PROMO_TYPES: { value: PromotionType; label: string; desc: string }[] = [
  { value: 'spend_discount',      label: '消費滿額折扣', desc: '滿 X 元折 Y 元（可多階段）' },
  { value: 'combo',               label: '組合優惠',     desc: '指定商品組合以較低價格結帳' },
  { value: 'percentage_discount', label: '折扣優惠',     desc: '全館或指定商品享幾折' },
  { value: 'add_on',              label: '加購優惠',     desc: '購買指定品類可加購商品' },
  { value: 'quantity_discount',   label: '數量折扣',     desc: '達到購買數量享折扣' },
  { value: 'member_discount',     label: '會員折扣',     desc: '會員享固定折扣金額' },
]

function typeLabel(type: PromotionType) {
  return PROMO_TYPES.find(t => t.value === type)?.label ?? type
}

function defaultConfig(type: PromotionType): Record<string, unknown> {
  switch (type) {
    case 'spend_discount':      return { tiers: [{ min_amount: 1000, discount: 100 }] }
    case 'combo':               return { product_ids: [], original_total: 0, combo_price: 0 }
    case 'percentage_discount': return { discount_rate: 0.9, scope: 'all', product_ids: [] }
    case 'add_on':              return { trigger_category: '', add_on_products: [] }
    case 'quantity_discount':   return { tiers: [{ min_qty: 2, discount_rate: 0.9 }] }
    case 'member_discount':     return { discount: 200 }
  }
}

// ── Config sub-forms ──────────────────────────────────────────

interface ConfigProps {
  config: Record<string, unknown>
  onChange: (cfg: Record<string, unknown>) => void
  products: Product[]
}

function SpendDiscountConfig({ config, onChange }: ConfigProps) {
  const tiers = (config.tiers as { min_amount: number; discount: number }[]) ?? []
  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-500">滿</span>
          <input type="number" value={tier.min_amount}
            onChange={e => { const t = [...tiers]; t[i] = { ...t[i], min_amount: +e.target.value }; onChange({ ...config, tiers: t }) }}
            className="w-28 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          <span className="text-xs text-gray-500">折</span>
          <input type="number" value={tier.discount}
            onChange={e => { const t = [...tiers]; t[i] = { ...t[i], discount: +e.target.value }; onChange({ ...config, tiers: t }) }}
            className="w-28 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          <span className="text-xs text-gray-500">元</span>
          {tiers.length > 1 && (
            <button onClick={() => onChange({ ...config, tiers: tiers.filter((_, j) => j !== i) })}
              className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ ...config, tiers: [...tiers, { min_amount: 0, discount: 0 }] })}
        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        <Plus className="w-3 h-3" /> 新增階段
      </button>
    </div>
  )
}

function ComboConfig({ config, onChange, products }: ConfigProps) {
  const ids = (config.product_ids as string[]) ?? []
  const comboPrice = (config.combo_price as number) ?? 0
  const originalTotal = products.filter(p => ids.includes(p.id)).reduce((s, p) => s + p.price, 0)
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">組合商品</p>
        <div className="max-h-44 overflow-y-auto space-y-1 rounded border border-gray-200 p-2 bg-white">
          {products.map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
              <input type="checkbox" checked={ids.includes(p.id)}
                onChange={e => {
                  const next = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id)
                  const ot = products.filter(p => next.includes(p.id)).reduce((s, p) => s + p.price, 0)
                  onChange({ ...config, product_ids: next, original_total: ot })
                }}
                className="rounded border-gray-300 text-indigo-600" />
              <span className="truncate flex-1">{p.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">${p.price.toLocaleString()}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-xs text-gray-500">原價合計：</span>
        <span className="font-medium">${originalTotal.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">組合價</span>
        <input type="number" value={comboPrice}
          onChange={e => onChange({ ...config, combo_price: +e.target.value, original_total: originalTotal })}
          className="w-28 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        {comboPrice > 0 && originalTotal > comboPrice && (
          <span className="text-xs text-amber-600">省 ${(originalTotal - comboPrice).toLocaleString()}</span>
        )}
      </div>
    </div>
  )
}

function PercentageConfig({ config, onChange, products }: ConfigProps) {
  const scope = (config.scope as string) ?? 'all'
  const rate = (config.discount_rate as number) ?? 0.9
  const ids = (config.product_ids as string[]) ?? []
  const discount = Math.round((1 - rate) * 10) / 10
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">折扣</span>
        <input type="number" value={discount} step="0.1" min="0.1" max="0.9"
          onChange={e => onChange({ ...config, discount_rate: Math.round((1 - +e.target.value) * 100) / 100 })}
          className="w-20 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        <span className="text-xs text-gray-500">折（0.9 = 九折，0.8 = 八折）</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">套用範圍</p>
        <select value={scope} onChange={e => onChange({ ...config, scope: e.target.value })}
          className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="all">全館</option>
          <option value="specific">指定商品</option>
        </select>
      </div>
      {scope === 'specific' && (
        <div>
          <p className="text-xs text-gray-500 mb-1">指定商品</p>
          <div className="max-h-44 overflow-y-auto space-y-1 rounded border border-gray-200 p-2 bg-white">
            {products.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                <input type="checkbox" checked={ids.includes(p.id)}
                  onChange={e => {
                    const next = e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id)
                    onChange({ ...config, product_ids: next })
                  }}
                  className="rounded border-gray-300 text-indigo-600" />
                <span className="truncate flex-1">{p.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">${p.price.toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AddOnConfig({ config, onChange, products }: ConfigProps) {
  const triggerCat = (config.trigger_category as string) ?? ''
  const addOns = (config.add_on_products as { product_id: string; add_on_price: number }[]) ?? []
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))] as string[]
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">觸發品類（購買此品類才可加購）</p>
        <select value={triggerCat} onChange={e => onChange({ ...config, trigger_category: e.target.value })}
          className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="">請選擇品類</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">可加購商品及加購價</p>
        <div className="space-y-2">
          {addOns.map((ao, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={ao.product_id}
                onChange={e => { const a = [...addOns]; a[i] = { ...a[i], product_id: e.target.value }; onChange({ ...config, add_on_products: a }) }}
                className="flex-1 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">選擇商品</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" value={ao.add_on_price} placeholder="加購價"
                onChange={e => { const a = [...addOns]; a[i] = { ...a[i], add_on_price: +e.target.value }; onChange({ ...config, add_on_products: a }) }}
                className="w-24 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button onClick={() => onChange({ ...config, add_on_products: addOns.filter((_, j) => j !== i) })}
                className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...config, add_on_products: [...addOns, { product_id: '', add_on_price: 0 }] })}
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <Plus className="w-3 h-3" /> 新增加購品
          </button>
        </div>
      </div>
    </div>
  )
}

function QuantityConfig({ config, onChange }: ConfigProps) {
  const tiers = (config.tiers as { min_qty: number; discount_rate: number }[]) ?? []
  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-500">買</span>
          <input type="number" value={tier.min_qty}
            onChange={e => { const t = [...tiers]; t[i] = { ...t[i], min_qty: +e.target.value }; onChange({ ...config, tiers: t }) }}
            className="w-20 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          <span className="text-xs text-gray-500">件打</span>
          <input type="number" value={Math.round(tier.discount_rate * 10)} min="1" max="9"
            onChange={e => { const t = [...tiers]; t[i] = { ...t[i], discount_rate: +e.target.value / 10 }; onChange({ ...config, tiers: t }) }}
            className="w-16 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          <span className="text-xs text-gray-500">折</span>
          {tiers.length > 1 && (
            <button onClick={() => onChange({ ...config, tiers: tiers.filter((_, j) => j !== i) })}
              className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      ))}
      <button onClick={() => onChange({ ...config, tiers: [...tiers, { min_qty: 0, discount_rate: 0.9 }] })}
        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        <Plus className="w-3 h-3" /> 新增階段
      </button>
    </div>
  )
}

function MemberConfig({ config, onChange }: ConfigProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500">會員折扣</span>
      <input type="number" value={config.discount as number}
        onChange={e => onChange({ ...config, discount: +e.target.value })}
        className="w-28 px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      <span className="text-xs text-gray-500">元</span>
    </div>
  )
}

function ConfigForm(props: { type: PromotionType } & ConfigProps) {
  switch (props.type) {
    case 'spend_discount':      return <SpendDiscountConfig {...props} />
    case 'combo':               return <ComboConfig {...props} />
    case 'percentage_discount': return <PercentageConfig {...props} />
    case 'add_on':              return <AddOnConfig {...props} />
    case 'quantity_discount':   return <QuantityConfig {...props} />
    case 'member_discount':     return <MemberConfig {...props} />
  }
}

// ── Main page ─────────────────────────────────────────────────

function nowLocal() {
  const d = new Date(); d.setSeconds(0, 0); return d.toISOString().slice(0, 16)
}
function in30Days() {
  const d = new Date(Date.now() + 30 * 86400000); d.setSeconds(0, 0); return d.toISOString().slice(0, 16)
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'spend_discount' as PromotionType,
    start_at: nowLocal(),
    end_at: in30Days(),
    config: defaultConfig('spend_discount'),
    is_active: true,
  })

  async function load() {
    setLoading(true)
    const [promos, prods] = await Promise.all([fetchAllPromotions(), fetchActiveProducts()])
    setPromotions(promos)
    setProducts(prods)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', type: 'spend_discount', start_at: nowLocal(), end_at: in30Days(), config: defaultConfig('spend_discount'), is_active: true })
    setModalOpen(true)
  }

  function openEdit(promo: Promotion) {
    setEditing(promo)
    setForm({
      name: promo.name,
      type: promo.type,
      start_at: promo.start_at.slice(0, 16),
      end_at: promo.end_at.slice(0, 16),
      config: promo.config,
      is_active: promo.is_active,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await upsertPromotion({
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        type: form.type,
        config: form.config,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        is_active: form.is_active,
      })
      setModalOpen(false)
      load()
    } catch (e) {
      alert('儲存失敗：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(promo: Promotion) {
    await togglePromotionActive(promo.id, !promo.is_active)
    load()
  }

  async function handleDelete(promo: Promotion) {
    if (!confirm(`確定要刪除「${promo.name}」嗎？`)) return
    await deletePromotion(promo.id)
    load()
  }

  function promoStatus(promo: Promotion): { label: string; variant: 'success' | 'gray' } {
    if (!promo.is_active) return { label: '停用', variant: 'gray' }
    const now = Date.now()
    if (new Date(promo.start_at).getTime() > now) return { label: '未開始', variant: 'gray' }
    if (new Date(promo.end_at).getTime() < now) return { label: '已結束', variant: 'gray' }
    return { label: '進行中', variant: 'success' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">促銷管理</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> 新增促銷
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-3 text-gray-400">
          <Tag className="w-10 h-10 opacity-30" />
          <p className="text-sm">尚無促銷規則，請點右上角新增</p>
        </div>
      ) : (
        <div className="space-y-2">
          {promotions.map(promo => {
            const status = promoStatus(promo)
            return (
              <div key={promo.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{promo.name}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      {typeLabel(promo.type)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(promo.start_at).toLocaleDateString('zh-TW')} – {new Date(promo.end_at).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(promo)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      promo.is_active ? 'text-gray-500 hover:bg-gray-100' : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {promo.is_active ? '停用' : '啟用'}
                  </button>
                  <button onClick={() => openEdit(promo)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-indigo-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(promo)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? '編輯促銷' : '新增促銷'} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">促銷名稱</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例如：新春買千送百"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">促銷類型</label>
              <select
                value={form.type}
                disabled={!!editing}
                onChange={e => {
                  const t = e.target.value as PromotionType
                  setForm(f => ({ ...f, type: t, config: defaultConfig(t) }))
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              >
                {PROMO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">開始時間</label>
                <input type="datetime-local" value={form.start_at}
                  onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">結束時間</label>
                <input type="datetime-local" value={form.end_at}
                  onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-700 mb-3">促銷設定</p>
              <ConfigForm
                type={form.type}
                config={form.config}
                onChange={cfg => setForm(f => ({ ...f, config: cfg }))}
                products={products}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
