import { supabase } from './supabase'
import type { Product, Promotion, Order, OrderItem, Location, Profile, Role } from '../types/database'
import type { CartSummary } from '../types/cart'

// ── Products ─────────────────────────────────────────────────

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Product[]
}

export async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Product[]
}

export async function upsertProduct(product: Partial<Product> & { name: string; price: number }) {
  const { data, error } = await supabase
    .from('products')
    .upsert(product)
    .select()
    .single()
  if (error) throw error
  return data as Product
}

export async function toggleProductActive(id: string, is_active: boolean) {
  const { error } = await supabase.from('products').update({ is_active }).eq('id', id)
  if (error) throw error
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('products').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('products').getPublicUrl(path)
  return data.publicUrl
}

// ── Promotions ───────────────────────────────────────────────

export async function fetchActivePromotions() {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .lte('start_at', now)
    .gte('end_at', now)
  if (error) throw error
  return data as Promotion[]
}

// ── Orders ───────────────────────────────────────────────────

export async function createOrder(
  summary: CartSummary,
  locationId: string,
  staffId: string,
  note?: string
): Promise<Order> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      location_id: locationId,
      staff_id: staffId,
      subtotal: summary.subtotal,
      discount_amount: summary.discount_amount,
      total: summary.total,
      promotions_applied: summary.discounts,
      note: note ?? null,
    })
    .select()
    .single()
  if (orderError) throw orderError

  const orderItems: Omit<OrderItem, 'id'>[] = summary.items.map(i => ({
    order_id: order.id,
    product_id: i.product.id,
    product_name: i.product.name,
    unit_price: i.product.price,
    quantity: i.quantity,
    subtotal: i.product.price * i.quantity,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) throw itemsError

  return order as Order
}

// ── Locations ────────────────────────────────────────────────

export async function fetchLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Location[]
}

export async function upsertLocation(location: { id?: string; name: string; is_active?: boolean }) {
  const { data, error } = await supabase
    .from('locations')
    .upsert(location)
    .select()
    .single()
  if (error) throw error
  return data as Location
}

export async function toggleLocationActive(id: string, is_active: boolean) {
  const { error } = await supabase.from('locations').update({ is_active }).eq('id', id)
  if (error) throw error
}

// ── Promotions (admin) ───────────────────────────────────────

export async function fetchAllPromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Promotion[]
}

export async function upsertPromotion(promo: Omit<Promotion, 'id' | 'created_at'> & { id?: string }) {
  const { data, error } = await supabase
    .from('promotions')
    .upsert(promo)
    .select()
    .single()
  if (error) throw error
  return data as Promotion
}

export async function togglePromotionActive(id: string, is_active: boolean) {
  const { error } = await supabase.from('promotions').update({ is_active }).eq('id', id)
  if (error) throw error
}

export async function deletePromotion(id: string) {
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw error
}

// ── Profiles (admin) ─────────────────────────────────────────

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, location:locations(id, name)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Profile[]
}

export async function updateProfile(id: string, updates: { role?: Role; display_name?: string; location_id?: string | null }) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) throw error
}

export async function createUser(payload: { email: string; password: string; display_name: string; role: Role; location_id: string | null }) {
  const { data, error } = await supabase.functions.invoke('create-user', { body: payload })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { success: boolean; user_id: string }
}

// ── Orders – date range (dashboard) ─────────────────────────

export async function fetchOrdersByDateRange(startIso: string, endIso: string, locationId?: string) {
  let query = supabase
    .from('orders')
    .select('id, created_at, subtotal, discount_amount, total, location_id, location:locations(name), staff:profiles(display_name)')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false })
  if (locationId) query = query.eq('location_id', locationId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as (Pick<Order, 'id' | 'created_at' | 'subtotal' | 'discount_amount' | 'total' | 'location_id'> & { location: { name: string } | null; staff: { display_name: string } | null })[]
}

export async function fetchTodayOrders(locationId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), staff:profiles(display_name)')
    .eq('location_id', locationId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
