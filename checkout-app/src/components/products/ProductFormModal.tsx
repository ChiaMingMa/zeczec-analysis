import { useState, useRef, type FormEvent } from 'react'
import { Upload, Link, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import type { Product } from '../../types/database'

interface Props {
  product?: Product
  onSave: (data: Partial<Product> & { name: string; price: number }) => Promise<void>
  onUploadImage: (file: File) => Promise<string>
  onClose: () => void
}

type ImageMode = 'url' | 'upload'

export function ProductFormModal({ product, onSave, onUploadImage, onClose }: Props) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [price, setPrice] = useState(product?.price?.toString() ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [imageMode, setImageMode] = useState<ImageMode>('url')
  const [previewUrl, setPreviewUrl] = useState(product?.image_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    setError(null)
    try {
      const url = await onUploadImage(file)
      setImageUrl(url)
      setPreviewUrl(url)
    } catch {
      setError('圖片上傳失敗，請再試一次')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('請輸入商品名稱')
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) return setError('請輸入有效價格')
    if (!imageUrl.trim()) return setError('請提供商品圖片')
    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...(product?.id ? { id: product.id } : {}),
        name: name.trim(),
        sku: sku.trim() || null,
        price: priceNum,
        image_url: imageUrl.trim(),
        category: category.trim() || null,
        is_active: product?.is_active ?? true,
      })
      onClose()
    } catch {
      setError('儲存失敗，請再試一次')
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? '編輯商品' : '新增商品'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 商品名稱 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱 *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：好肩力 Pro｜斜方肌肩頸按摩器"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 商品編號 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品編號</label>
          <input
            type="text"
            value={sku}
            onChange={e => setSku(e.target.value)}
            placeholder="例：G09-14"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 價格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">定價（元）*</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="2980"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 分類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品分類</label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="例：肩頸按摩、健康監測"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 圖片 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品圖片 *</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setImageMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                imageMode === 'url'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              貼上網址
            </button>
            <button
              type="button"
              onClick={() => { setImageMode('upload'); fileRef.current?.click() }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                imageMode === 'upload'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              上傳圖片
            </button>
          </div>

          {imageMode === 'url' && (
            <input
              type="url"
              value={imageUrl}
              onChange={e => { setImageUrl(e.target.value); setPreviewUrl(e.target.value) }}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* 預覽 */}
          {(previewUrl || uploading) && (
            <div className="mt-2 w-full h-40 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">上傳中…</span>
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="preview" className="w-full h-full object-contain" />
              ) : null}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? '儲存中…' : isEdit ? '儲存變更' : '新增商品'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
