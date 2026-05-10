import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Beneficiary } from '../types'

export interface BeneficiaryInput {
  fullName: string
  accountNumber: string
  bankName: string
  branchCode?: string
  reference?: string
}

export const useBeneficiaries = (userId?: string) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    api.get('/beneficiaries')
      .then(({ data }) => {
        setBeneficiaries(data as Beneficiary[])
      })
      .catch(err => console.error('Failed to load beneficiaries:', err))
      .finally(() => setLoading(false))
  }, [userId])

  const addBeneficiary = async (input: BeneficiaryInput): Promise<Beneficiary> => {
    const { data } = await api.post('/beneficiaries', input)
    const mapped = data as Beneficiary
    setBeneficiaries(prev => [...prev, mapped].sort((a, b) => a.fullName.localeCompare(b.fullName)))
    return mapped
  }

  const deleteBeneficiary = async (id: string) => {
    await api.delete(`/beneficiaries/${id}`)
    setBeneficiaries(prev => prev.filter(b => b.id !== id))
  }

  const blockBeneficiary = async (id: string, block: boolean) => {
    const { data } = await api.patch(`/beneficiaries/${id}/block`, { block })
    const updated = data as Beneficiary
    setBeneficiaries(prev => prev.map(b => b.id === id ? updated : b))
  }

  return { beneficiaries, loading, addBeneficiary, deleteBeneficiary, blockBeneficiary }
}
