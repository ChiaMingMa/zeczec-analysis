import { useState, useEffect, useCallback } from 'react'
import { fetchProducts, upsertProduct, toggleProductActive, uploadProductImage } from '../lib/api'
import type { Product } from '../types/database'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts()
      setProducts(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveProduct(product: Partial<Product> & { name: string; price: number }) {
    await upsertProduct(product)
    await load()
  }

  async function toggleActive(id: string, is_active: boolean) {
    await toggleProductActive(id, is_active)
    setProducts(ps => ps.map(p => p.id === id ? { ...p, is_active } : p))
  }

  async function uploadImage(file: File) {
    return uploadProductImage(file)
  }

  return { products, loading, error, saveProduct, toggleActive, uploadImage, reload: load }
}
