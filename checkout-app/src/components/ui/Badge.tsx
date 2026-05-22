interface Props {
  variant: 'success' | 'gray'
  children: React.ReactNode
}

const styles = {
  success: 'bg-green-50 text-green-700',
  gray:    'bg-gray-100 text-gray-500',
}

export function Badge({ variant, children }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}
