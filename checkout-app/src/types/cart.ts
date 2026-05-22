import type { Product } from './database'

export interface CartItem {
  product: Product
  quantity: number
}

export interface AppliedDiscount {
  promotion_id: string
  name: string
  type: string
  amount: number
}

export interface CartSummary {
  items: CartItem[]
  subtotal: number
  discounts: AppliedDiscount[]
  discount_amount: number
  total: number
}
