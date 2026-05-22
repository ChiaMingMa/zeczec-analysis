import { supabase } from './supabase'
import type { Product, Promotion, Order, OrderItem } from '../types/database'
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
