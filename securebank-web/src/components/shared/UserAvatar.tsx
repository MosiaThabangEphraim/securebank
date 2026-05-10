interface Props {
  name: string
  avatarUrl: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function UserAvatar({ name, avatarUrl, size = 'sm', className = '' }: Props) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const base = `${SIZE[size]} rounded-full flex-shrink-0 ${className}`

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${base} object-cover`}
      />
    )
  }

  return (
    <div className={`${base} bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white`}>
      {initials}
    </div>
  )
}
