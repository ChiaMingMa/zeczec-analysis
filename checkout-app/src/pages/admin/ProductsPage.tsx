import { useState } from 'react'
import { Plus, Pencil, Eye, EyeOff, Loader2, AlertCircle, Search } from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { ProductFormModal } from '../../components/products/ProductFormModal'
import { Badge } from '../../components/ui/Badge'
import type { Product } from '../../types/database'

export function ProductsPage() {
  const { products, loading, error, saveProduct, toggleActive, uploadImage, reload } = useProducts()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setEditing(undefined); setModalOpen(true) }
  function openEdit(p: Product) { setEditing(p); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(undefined) }

  async function handleToggle(p: Product) {
    setTogglingId(p.id)
    try { await toggleActive(p.id, !p.is_active) }
    finally { setTogglingId(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">商品管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">共 {products.length} 件商品，上架中 {products.filter(p => p.is_active).length} 件</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增商品
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋商品名稱或分類…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={reload} className="ml-auto underline">重試</button>
        </div>
      )}

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="text-sm">{search ? '找不到符合的商品' : '尚無商品，點右上角新增'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border overflow-hidden transition-opacity ${
                p.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Image */}
              <div className="aspect-square bg-gray-50 overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">無圖片</div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug flex-1">{p.name}</p>
                  <Badge variant={p.is_active ? 'success' : 'gray'}>
                    {p.is_active ? '上架' : '下架'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  {p.sku && <span className="text-xs text-gray-400 font-mono">{p.sku}</span>}
                  {p.category && <span className="text-xs text-gray-400">{p.category}</span>}
                </div>
                <p className="text-base font-bold text-indigo-600">
                  ${p.price.toLocaleString()}
                </p>
              </div>

              {/* Actions */}
              <div className="px-3 pb-3 flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  編輯
                </button>
                <button
                  onClick={() => handleToggle(p)}
                  disabled={togglingId === p.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-colors ${
                    p.is_active
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  {togglingId === p.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : p.is_active ? (
                    <><EyeOff className="w-3.5 h-3.5" />下架</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" />上架</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ProductFormModal
          product={editing}
          onSave={saveProduct}
          onUploadImage={uploadImage}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
