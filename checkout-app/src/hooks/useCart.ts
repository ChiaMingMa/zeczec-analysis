import { useState, useMemo, useCallback } from 'react'
import { calcPromotions } from '../lib/promotionEngine'
import type { CartItem, CartSummary } from '../types/cart'
import type { Product, Promotion } from '../types/database'

export function useCart(promotions: Promotion[]) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])

  const summary = useMemo((): CartSummary => {
    const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
    const activePromos = promotions.filter(p => {
      const now = Date.now()
      return p.is_active && new Date(p.start_at).getTime() <= now && new Date(p.end_at).getTime() >= now
    })
    const discounts = calcPromotions(items, activePromos)
    const discount_amount = discounts.reduce((s, d) => s + d.amount, 0)
    return { items, subtotal, discounts, discount_amount, total: Math.max(0, subtotal - discount_amount) }
  }, [items, promotions])

  return { items, summary, addItem, removeItem, updateQty, clearCart }
}
