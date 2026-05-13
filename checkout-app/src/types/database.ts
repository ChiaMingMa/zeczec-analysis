export type Role = 'admin' | 'staff'

export interface Location {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  role: Role
  display_name: string
  location_id: string | null
  created_at: string
  location?: Location
}

export interface Product {
  id: string
  name: string
  image_url: string
  price: number
  category: string | null
  is_active: boolean
  created_at: string
}

export type PromotionType =
  | 'spend_discount'
  | 'combo'
  | 'percentage_discount'
  | 'add_on'
  | 'quantity_discount'
  | 'member_discount'

export interface Promotion {
  id: string
  name: string
  type: PromotionType
  config: Record<string, unknown>
  start_at: string
  end_at: string
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  location_id: string
  staff_id: string
  subtotal: number
  discount_amount: number
  total: number
  promotions_applied: Record<string, unknown>[]
  member_id: string | null
  note: string | null
  created_at: string
  location?: Location
  staff?: Profile
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
}

export interface Member {
  id: string
  phone: string
  name: string
  line_uid: string | null
  joined_location_id: string | null
  created_at: string
}
