import type { CartItem, AppliedDiscount } from '../types/cart'
import type { Promotion } from '../types/database'

export function calcPromotions(items: CartItem[], promotions: Promotion[]): AppliedDiscount[] {
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const discounts: AppliedDiscount[] = []

  for (const promo of promotions) {
    const cfg = promo.config as Record<string, unknown>

    switch (promo.type) {
      case 'spend_discount': {
        const tiers = (cfg.tiers as { min_amount: number; discount: number }[]) ?? []
        const best = [...tiers]
          .filter(t => subtotal >= t.min_amount)
          .sort((a, b) => b.min_amount - a.min_amount)[0]
        if (best) discounts.push({ promotion_id: promo.id, name: promo.name, type: promo.type, amount: best.discount })
        break
      }

      case 'combo': {
        const ids = (cfg.product_ids as string[]) ?? []
        const inCart = ids.every(id => items.some(i => i.product.id === id))
        if (inCart) {
          const orig = cfg.original_total as number
          const combo = cfg.combo_price as number
          discounts.push({ promotion_id: promo.id, name: promo.name, type: promo.type, amount: orig - combo })
        }
        break
      }

      case 'percentage_discount': {
        const rate = cfg.discount_rate as number
        const scope = cfg.scope as string
        let base = 0
        if (scope === 'all') {
          base = subtotal
        } else {
          const ids = (cfg.product_ids as string[]) ?? []
          base = items
            .filter(i => ids.includes(i.product.id))
            .reduce((s, i) => s + i.product.price * i.quantity, 0)
        }
        if (base > 0) {
          const amount = Math.round(base * (1 - rate))
          discounts.push({ promotion_id: promo.id, name: promo.name, type: promo.type, amount })
        }
        break
      }

      case 'add_on': {
        const triggerCat = cfg.trigger_category as string
        const hasTrigger = items.some(i => i.product.category === triggerCat)
        if (!hasTrigger) break
        const addOns = (cfg.add_on_products as { product_id: string; add_on_price: number }[]) ?? []
        let saving = 0
        for (const ao of addOns) {
          const cartItem = items.find(i => i.product.id === ao.product_id)
          if (cartItem) {
            saving += (cartItem.product.price - ao.add_on_price) * cartItem.quantity
          }
        }
        if (saving > 0) discounts.push({ promotion_id: promo.id, name: promo.name, type: promo.type, amount: saving })
        break
      }

      case 'quantity_discount': {
        const tiers = (cfg.tiers as { min_qty: number; discount_rate: number }[]) ?? []
        const best = [...tiers]
          .filter(t => totalQty >= t.min_qty)
          .sort((a, b) => b.min_qty - a.min_qty)[0]
        if (best) {
          const amount = Math.round(subtotal * (1 - best.discount_rate))
          discounts.push({ promotion_id: promo.id, name: promo.name, type: promo.type, amount })
        }
        break
      }

      case 'member_discount': {
        const amount = cfg.discount as number
        if (amount > 0) discounts.push({ promotion_id: promo.id, name: promo.name, type: promo.type, amount })
        break
      }
    }
  }

  return discounts
}
