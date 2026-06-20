import React from 'react'

interface CardProps { children: React.ReactNode; className?: string; onClick?: () => void; hover?: boolean }
export function Card({ children, className = '', onClick, hover }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4
      ${hover ? 'hover:shadow-md hover:border-[#E85D04]/30 transition-all cursor-pointer' : ''}
      ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

interface StatCardProps { label: string; value: string | number; icon: React.ReactNode; color?: string; sub?: string }
export function StatCard({ label, value, icon, color = '#E85D04', sub }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-[#1A1A2E] mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' }
export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-600', success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700', danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700', primary: 'bg-orange-100 text-[#E85D04]'
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

interface ProgressBarProps { value: number; max?: number; color?: string; className?: string; showLabel?: boolean }
export function ProgressBar({ value, max = 100, color, className = '', showLabel }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  const barColor = color || (pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#E85D04')
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      {showLabel && <span className="text-xs font-medium text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>}
    </div>
  )
}

interface EmptyStateProps { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">{icon}</div>
      <p className="text-base font-semibold text-gray-600">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
