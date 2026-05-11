import { useState, useEffect } from 'react'
import { X, User, Phone, MapPin, Globe, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createAlert } from '../../lib/createAlert'
import toast from 'react-hot-toast'

function Field({ icon: Icon, label, value, onChange, placeholder, maxLength }: {
  icon: React.ElementType; label: string; value: string
  onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="input-dark pl-9 text-sm py-2.5"
        />
      </div>
    </div>
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export const EditProfileModal: React.FC<Props> = ({ isOpen, onClose, userId }) => {
  const [fullName,    setFullName]    = useState('')
  const [phone,       setPhone]       = useState('')
  const [address,     setAddress]     = useState('')
  const [city,        setCity]        = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [fetching,    setFetching]    = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFetching(true)
    ;(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone_number, address, city, country_code')
          .eq('id', userId)
          .single()
        if (data) {
          const r = data as Record<string, unknown>
          setFullName(    (r.full_name    as string) ?? '')
          setPhone(       (r.phone_number as string) ?? '')
          setAddress(     (r.address      as string) ?? '')
          setCity(        (r.city         as string) ?? '')
          setCountryCode( (r.country_code as string) ?? '')
        }
      } finally {
        setFetching(false)
      }
    })()
  }, [isOpen, userId])

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error('Full name is required'); return }
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:    fullName.trim(),
          phone_number: phone.trim() || null,
          address:      address.trim() || null,
          city:         city.trim() || null,
          country_code: countryCode.trim() || null,
        })
        .eq('id', userId)

      if (error) throw error

      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
      createAlert({ userId, alertType: 'info', title: 'Profile Updated', message: 'Your personal details (name, phone, address) were successfully updated.' }).catch(console.error)
      toast.success('Profile updated')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-dark-850 border border-dark-700 rounded-2xl shadow-2xl animate-fade-in">

        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Edit Profile</p>
              <p className="text-xs text-gray-500">Update your personal details</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {fetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : (
            <>
              <Field icon={User}   label="Full Name"    value={fullName}     onChange={setFullName}     placeholder="John Smith" />
              <Field icon={Phone}  label="Phone Number" value={phone}        onChange={setPhone}        placeholder="+27 82 000 0000" />
              <Field icon={MapPin} label="Address"      value={address}      onChange={setAddress}      placeholder="123 Main Street" />
              <Field icon={MapPin} label="City"         value={city}         onChange={setCity}         placeholder="Cape Town" />
              <Field icon={Globe}  label="Country Code" value={countryCode}  onChange={setCountryCode}  placeholder="ZA" maxLength={2} />
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading || fetching}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
