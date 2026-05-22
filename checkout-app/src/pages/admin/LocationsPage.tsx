import { useState, useEffect } from 'react'
import { MapPin, Plus, Edit2, Loader2, Check, X } from 'lucide-react'
import { fetchLocations, upsertLocation, toggleLocationActive } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { Location } from '../../types/database'

export function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    fetchLocations().then(setLocations).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setName('')
    setModalOpen(true)
  }

  function openEdit(loc: Location) {
    setEditing(loc)
    setName(loc.name)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await upsertLocation({ ...(editing ? { id: editing.id } : {}), name: name.trim() })
      setModalOpen(false)
      load()
    } catch (e) {
      alert('儲存失敗：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(loc: Location) {
    await toggleLocationActive(loc.id, !loc.is_active)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">據點管理</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> 新增據點
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {locations.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <MapPin className="w-10 h-10 opacity-30" />
              <p className="text-sm">尚無據點，請點右上角新增</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {locations.map(loc => (
                <div key={loc.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{loc.name}</p>
                    <p className="text-xs text-gray-400">{new Date(loc.created_at).toLocaleDateString('zh-TW')}</p>
                  </div>
                  <Badge variant={loc.is_active ? 'success' : 'gray'}>
                    {loc.is_active ? '啟用' : '停用'}
                  </Badge>
                  <button
                    onClick={() => handleToggle(loc)}
                    title={loc.is_active ? '停用' : '啟用'}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    {loc.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(loc)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-indigo-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={editing ? '編輯據點' : '新增據點'} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">據點名稱</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：新竹巨城"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
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
