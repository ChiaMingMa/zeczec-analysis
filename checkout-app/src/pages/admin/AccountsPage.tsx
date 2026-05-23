import { useState, useEffect } from 'react'
import { Users, Edit2, Loader2, Plus } from 'lucide-react'
import { fetchProfiles, fetchLocations, updateProfile, createUser } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { Profile, Location, Role } from '../../types/database'

type ModalMode = 'edit' | 'create'

const emptyCreate = { email: '', password: '', display_name: '', role: 'staff' as Role, location_id: '' }

export function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('edit')
  const [editing, setEditing] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<{ display_name: string; role: Role; location_id: string }>({
    display_name: '', role: 'staff', location_id: '',
  })
  const [createForm, setCreateForm] = useState(emptyCreate)

  async function load() {
    setLoading(true)
    const [profs, locs] = await Promise.all([fetchProfiles(), fetchLocations()])
    setProfiles(profs)
    setLocations(locs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openEdit(profile: Profile) {
    setEditing(profile)
    setEditForm({ display_name: profile.display_name, role: profile.role, location_id: profile.location_id ?? '' })
    setModalMode('edit')
    setModalOpen(true)
  }

  function openCreate() {
    setCreateForm(emptyCreate)
    setModalMode('create')
    setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditing(null) }

  async function handleEdit() {
    if (!editing || !editForm.display_name.trim()) return
    setSaving(true)
    try {
      await updateProfile(editing.id, {
        display_name: editForm.display_name.trim(),
        role: editForm.role,
        location_id: editForm.location_id || null,
      })
      closeModal()
      load()
    } catch (e) {
      alert('儲存失敗：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    if (!createForm.email || !createForm.password || !createForm.display_name.trim()) return
    setSaving(true)
    try {
      await createUser({
        email: createForm.email.trim(),
        password: createForm.password,
        display_name: createForm.display_name.trim(),
        role: createForm.role,
        location_id: createForm.location_id || null,
      })
      closeModal()
      load()
    } catch (e) {
      alert('新增失敗：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">帳號管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">共 {profiles.length} 個帳號</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增帳號
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {profiles.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">尚無帳號</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {profiles.map(profile => (
                <div key={profile.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-600">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{profile.display_name}</p>
                    <p className="text-xs text-gray-400">{profile.location?.name ?? '未指定據點'}</p>
                  </div>
                  <Badge variant={profile.role === 'admin' ? 'success' : 'gray'}>
                    {profile.role === 'admin' ? '管理者' : '櫃姐'}
                  </Badge>
                  <button
                    onClick={() => openEdit(profile)}
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

      {/* 編輯帳號 Modal */}
      {modalOpen && modalMode === 'edit' && editing && (
        <Modal onClose={closeModal} title="編輯帳號" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">顯示名稱</label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">角色</label>
              <select
                value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="staff">櫃姐</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">所屬據點</label>
              <select
                value={editForm.location_id}
                onChange={e => setEditForm(f => ({ ...f, location_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">未指定</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
              <button
                onClick={handleEdit}
                disabled={saving || !editForm.display_name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 新增帳號 Modal */}
      {modalOpen && modalMode === 'create' && (
        <Modal onClose={closeModal} title="新增帳號" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                autoFocus
                placeholder="staff@example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">初始密碼 *</label>
              <input
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="至少 6 個字元"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">顯示名稱 *</label>
              <input
                type="text"
                value={createForm.display_name}
                onChange={e => setCreateForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="例：王小明"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">角色</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="staff">櫃姐</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">所屬據點</label>
              <select
                value={createForm.location_id}
                onChange={e => setCreateForm(f => ({ ...f, location_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">未指定</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.email || !createForm.password || !createForm.display_name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? '建立中…' : '建立帳號'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
