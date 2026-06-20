import { useRef, useState, useEffect } from 'react'
import { Trash2, Check } from 'lucide-react'

interface Props {
  onSalvar: (dataUrl: string) => void
  altura?: number
  label?: string
}

export default function AssinaturaDigital({ onSalvar, altura = 150, label = 'Assinar aqui' }: Props) {
  const canvasRef                   = useRef<HTMLCanvasElement>(null)
  const [desenhando, setDesenhando] = useState(false)
  const [temAssinatura, setTem]     = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    ctx.strokeStyle = '#1F2937'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect  = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const touch  = (e as React.TouchEvent).touches?.[0]
    return {
      x: ((touch?.clientX ?? (e as React.MouseEvent).clientX) - rect.left) * scaleX,
      y: ((touch?.clientY ?? (e as React.MouseEvent).clientY) - rect.top)  * scaleY,
    }
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDesenhando(true)
    setTem(true)
  }

  function desenhar(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function parar() { setDesenhando(false) }

  function limpar() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setTem(false)
  }

  function salvar() {
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    onSalvar(dataUrl)
  }

  return (
    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <button
          type="button"
          onClick={limpar}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Limpar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={altura}
        className="w-full bg-white dark:bg-gray-900 touch-none cursor-crosshair"
        onMouseDown={iniciar}
        onMouseMove={desenhar}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={desenhar}
        onTouchEnd={parar}
      />

      {temAssinatura && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={salvar}
            className="flex items-center gap-2 justify-center w-full px-4 py-2 bg-azul text-white rounded-lg font-medium hover:bg-azul/90 transition-colors"
          >
            <Check className="w-4 h-4" />
            Confirmar Assinatura
          </button>
        </div>
      )}
    </div>
  )
}
