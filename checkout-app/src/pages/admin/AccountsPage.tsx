import { useState, useEffect } from 'react'
import { Users, Edit2, Loader2 } from 'lucide-react'
import { fetchProfiles, fetchLocations, updateProfile } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { Profile, Location, Role } from '../../types/database'

export function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ display_name: string; role: Role; location_id: string }>({
    display_name: '', role: 'staff', location_id: '',
  })

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
    setForm({
      display_name: profile.display_name,
      role: profile.role,
      location_id: profile.location_id ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!editing || !form.display_name.trim()) return
    setSaving(true)
    try {
      await updateProfile(editing.id, {
        display_name: form.display_name.trim(),
        role: form.role,
        location_id: form.location_id || null,
      })
      setModalOpen(false)
      load()
    } catch (e) {
      alert('儲存失敗：' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">帳號管理</h2>
        <p className="text-xs text-gray-400">如需新增帳號，請在 Supabase 後台建立使用者</p>
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

      {modalOpen && editing && (
        <Modal onClose={() => setModalOpen(false)} title="編輯帳號" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">顯示名稱</label>
              <input
                type="text"
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">角色</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="staff">櫃姐</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">所屬據點</label>
              <select
                value={form.location_id}
                onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">未指定</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
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
                disabled={saving || !form.display_name.trim()}
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
