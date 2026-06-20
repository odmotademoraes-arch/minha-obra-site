import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}
export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>}
      <input id={inputId}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100'}
          disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
        {...props} />
      {hint && !error && <span className="text-xs text-gray-500">{hint}</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string; label: string }[]
}
export function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>}
      <select id={inputId}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100'}
          bg-white ${className}`}
        {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}
export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea id={inputId} rows={3}
        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all resize-vertical
          ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-[#E85D04] focus:ring-2 focus:ring-orange-100'}
          ${className}`}
        {...props} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
