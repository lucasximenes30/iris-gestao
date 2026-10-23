'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ALL_INITIAL_FLAVORS, CONFECTIONERY_FLAVORS } from '@/lib/constants'

export interface FlavorItem {
  id: string
  flavor: string
  quantity: number
}

interface FlavorComposerProps {
  value: string
  onChange: (notes: string, totalUnits: number) => void
  targetQuantity?: number
  flavorCategory?: 'convencionais' | 'especiais' | 'premium' | 'all'
  placeholder?: string
  label?: string
}

const STORAGE_KEY = 'iris_custom_flavors_v1'

// Parser para converter strings como "30x Brigadeiro, 20 Beijinho, 50 Ninho" em objetos estruturados
function parseNotesToFlavors(text: string): FlavorItem[] {
  if (!text || !text.trim()) return []

  const parts = text.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean)
  const result: FlavorItem[] = []

  parts.forEach((part, index) => {
    // Regex para capturar: "30x Sabor", "30 x Sabor", "30 Sabor", "Sabor: 30"
    const matchPrefix = part.match(/^(\d+)\s*(?:x|un|unid)?\s*[:-]?\s*(.+)$/i)
    const matchSuffix = part.match(/^(.+?)\s*[:-]?\s*(\d+)\s*(?:x|un|unid)?$/i)

    if (matchPrefix) {
      const qty = parseInt(matchPrefix[1], 10)
      const flavor = matchPrefix[2].trim()
      if (flavor) {
        result.push({ id: `flv-${index}-${Date.now()}`, flavor, quantity: qty || 1 })
        return
      }
    } else if (matchSuffix && !matchSuffix[1].match(/^\d+$/)) {
      const flavor = matchSuffix[1].trim()
      const qty = parseInt(matchSuffix[2], 10)
      if (flavor) {
        result.push({ id: `flv-${index}-${Date.now()}`, flavor, quantity: qty || 1 })
        return
      }
    }

    // Se for apenas texto sem número identificável
    result.push({ id: `flv-${index}-${Date.now()}`, flavor: part, quantity: 1 })
  })

  return result
}

function serializeFlavors(flavors: FlavorItem[]): string {
  return flavors
    .map(f => `${f.quantity}x ${f.flavor}`)
    .join(', ')
}

export default function FlavorComposer({
  value,
  onChange,
  targetQuantity = 100,
  flavorCategory = 'convencionais',
  placeholder = 'Ex: 30 churros, 30 ninho...',
  label = 'Sabores & Composição da Encomenda'
}: FlavorComposerProps) {
  // Inicializa a lista de sabores estruturada
  const [flavors, setFlavors] = useState<FlavorItem[]>(() => parseNotesToFlavors(value))
  const [inputValue, setInputValue] = useState('')
  const [isOpenSuggestions, setIsOpenSuggestions] = useState(false)
  const [customFlavors, setCustomFlavors] = useState<string[]>([])
  const [mode, setMode] = useState<'interactive' | 'raw'>('interactive')
  const [rawText, setRawText] = useState(value || '')

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Carrega sabores aprendidos do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setCustomFlavors(parsed)
        }
      }
    } catch {
      // Ignora erro de localStorage
    }
  }, [])

  // Atualiza quando o valor externo mudar significativamente e estiver vazio
  useEffect(() => {
    if (value && flavors.length === 0 && !rawText) {
      const parsed = parseNotesToFlavors(value)
      setFlavors(parsed)
      setRawText(value)
    }
  }, [value])

  // Lista combinada de sabores conhecidos
  const allKnownFlavors = useMemo(() => {
    let baseList = ALL_INITIAL_FLAVORS
    if (flavorCategory && flavorCategory !== 'all' && CONFECTIONERY_FLAVORS[flavorCategory]) {
      // Prioriza a categoria correspondente mas mantém os demais
      const catList = CONFECTIONERY_FLAVORS[flavorCategory]
      const others = ALL_INITIAL_FLAVORS.filter(f => !catList.includes(f))
      baseList = [...catList, ...others]
    }
    const combined = Array.from(new Set([...baseList, ...customFlavors]))
    return combined
  }, [flavorCategory, customFlavors])

  // Sugestões rápidas mais usadas ou da categoria
  const popularCategoryFlavors = useMemo(() => {
    if (flavorCategory && flavorCategory !== 'all' && CONFECTIONERY_FLAVORS[flavorCategory]) {
      return CONFECTIONERY_FLAVORS[flavorCategory].slice(0, 8)
    }
    return ALL_INITIAL_FLAVORS.slice(0, 8)
  }, [flavorCategory])

  // Total de unidades somadas
  const totalUnits = useMemo(() => {
    return flavors.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0)
  }, [flavors])

  // Unidades restantes para bater a meta
  const remainingUnits = Math.max(0, targetQuantity - totalUnits)

  // Dispara alteração para o componente pai
  const triggerChange = (newFlavors: FlavorItem[]) => {
    setFlavors(newFlavors)
    const serialized = serializeFlavors(newFlavors)
    setRawText(serialized)
    const units = newFlavors.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0)
    onChange(serialized, units)
  }

  // Aprende novo sabor se não existir
  const learnFlavor = (flavorName: string) => {
    const trimmed = flavorName.trim()
    if (!trimmed) return
    const exists = allKnownFlavors.some(f => f.toLowerCase() === trimmed.toLowerCase())
    if (!exists) {
      const updated = [...customFlavors, trimmed]
      setCustomFlavors(updated)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // Ignora erro
      }
    }
  }

  // Parse do que a usuária digitou no input para sugestões
  const parsedInput = useMemo(() => {
    const raw = inputValue.trim()
    if (!raw) return { qty: null, query: '' }
    
    // Tenta casar "30 churros", "30x churros", "churros 30"
    const matchPrefix = raw.match(/^(\d+)\s*(?:x|un)?\s*(.*)$/i)
    if (matchPrefix) {
      return {
        qty: parseInt(matchPrefix[1], 10),
        query: matchPrefix[2].trim().toLowerCase()
      }
    }

    return {
      qty: null,
      query: raw.toLowerCase()
    }
  }, [inputValue])

  // Filtra sugestões baseadas no query digitado
  const filteredSuggestions = useMemo(() => {
    if (!parsedInput.query) {
      // Se não digitou texto de busca, sugere os principais ainda não adicionados
      const addedNames = new Set(flavors.map(f => f.flavor.toLowerCase()))
      return allKnownFlavors.filter(f => !addedNames.has(f.toLowerCase())).slice(0, 6)
    }

    return allKnownFlavors
      .filter(f => f.toLowerCase().includes(parsedInput.query))
      .slice(0, 8)
  }, [allKnownFlavors, parsedInput.query, flavors])

  // Adiciona um sabor (seja clicado ou digitado)
  const handleAddFlavor = (flavorName: string, explicitQty?: number) => {
    const name = flavorName.trim()
    if (!name) return

    // Determina a quantidade
    let qty = explicitQty ?? parsedInput.qty
    if (!qty || isNaN(qty) || qty <= 0) {
      // Se não especificou quantidade, tenta usar o que falta para completar a meta ou 10
      qty = remainingUnits > 0 ? remainingUnits : 20
    }

    // Capitaliza adequadamente se for novo
    const matchedKnown = allKnownFlavors.find(f => f.toLowerCase() === name.toLowerCase())
    const finalName = matchedKnown || name.charAt(0).toUpperCase() + name.slice(1)

    // Se o sabor já estiver na lista, apenas soma a quantidade
    const existingIndex = flavors.findIndex(f => f.flavor.toLowerCase() === finalName.toLowerCase())
    let nextFlavors: FlavorItem[]

    if (existingIndex >= 0) {
      nextFlavors = flavors.map((f, i) =>
        i === existingIndex ? { ...f, quantity: f.quantity + qty } : f
      )
    } else {
      nextFlavors = [
        ...flavors,
        {
          id: `flv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          flavor: finalName,
          quantity: qty
        }
      ]
    }

    learnFlavor(finalName)
    triggerChange(nextFlavors)
    setInputValue('')
    setIsOpenSuggestions(false)
    inputRef.current?.focus()
  }

  // Tecla Enter no input de texto
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSuggestions.length > 0 && parsedInput.query) {
        handleAddFlavor(filteredSuggestions[0])
      } else if (parsedInput.query) {
        // Sabor novo livre
        handleAddFlavor(parsedInput.query)
      } else if (inputValue.trim()) {
        handleAddFlavor(inputValue.trim())
      }
    } else if (e.key === 'Escape') {
      setIsOpenSuggestions(false)
    }
  }

  // Ajuste rápido de quantidade na pill (+5 / -5)
  const handleAdjustQty = (id: string, delta: number) => {
    const updated = flavors
      .map(f => {
        if (f.id === id) {
          const newQty = Math.max(0, f.quantity + delta)
          return { ...f, quantity: newQty }
        }
        return f
      })
      .filter(f => f.quantity > 0)

    triggerChange(updated)
  }

  // Remover sabor
  const handleRemoveFlavor = (id: string) => {
    const updated = flavors.filter(f => f.id !== id)
    triggerChange(updated)
  }

  // Alternar para modo texto livre (para quem prefere colar texto do WhatsApp)
  const handleRawChange = (text: string) => {
    setRawText(text)
    const parsed = parseNotesToFlavors(text)
    setFlavors(parsed)
    const units = parsed.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0)
    onChange(text, units)
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpenSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-3 bg-amber-50/40 p-3.5 sm:p-4 rounded-xl border border-amber-200/80">
      {/* Cabeçalho com indicador de meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🍬</span>
          <label className="text-xs font-bold text-amber-950 uppercase tracking-wider">
            {label}
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de Progresso do Cento */}
          {targetQuantity > 0 && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                totalUnits === targetQuantity
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : totalUnits < targetQuantity
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              <span>
                {totalUnits} / {targetQuantity} un
              </span>
              {totalUnits === targetQuantity ? (
                <span className="text-emerald-600 font-extrabold">✓ Completo</span>
              ) : totalUnits < targetQuantity ? (
                <span className="text-amber-700 font-normal">
                  (faltam {remainingUnits})
                </span>
              ) : (
                <span className="text-red-700 font-normal">
                  (+{totalUnits - targetQuantity} a mais)
                </span>
              )}
            </div>
          )}

          {/* Toggle modo interativo vs texto livre */}
          <button
            type="button"
            onClick={() => {
              if (mode === 'interactive') {
                setRawText(serializeFlavors(flavors))
                setMode('raw')
              } else {
                setFlavors(parseNotesToFlavors(rawText))
                setMode('interactive')
              }
            }}
            className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 underline"
            title="Alternar modo de digitação"
          >
            {mode === 'interactive' ? 'Colar texto' : 'Modo visual'}
          </button>
        </div>
      </div>

      {mode === 'raw' ? (
        <div>
          <textarea
            value={rawText}
            onChange={(e) => handleRawChange(e.target.value)}
            rows={3}
            placeholder="Cole ou digite aqui: 30 churros, 30 ninho, 20 beijinho, 20 brigadeiro..."
            className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400 resize-none font-mono"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Dica: Digite a quantidade antes do nome de cada sabor (ex: <i>30 ninho, 30 churros</i>).
          </p>
        </div>
      ) : (
        <div className="space-y-2.5" ref={containerRef}>
          {/* Tags / Pills de Sabores Adicionados */}
          {flavors.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {flavors.map((item) => (
                <div
                  key={item.id}
                  className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white text-slate-800 rounded-lg border border-amber-300/80 shadow-2xs text-xs font-semibold"
                >
                  <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[11px] font-bold">
                    {item.quantity}x
                  </span>
                  <span className="text-slate-800">{item.flavor}</span>

                  <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustQty(item.id, -5)}
                      className="w-4 h-4 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px]"
                      title="Diminuir 5 un"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustQty(item.id, 5)}
                      className="w-4 h-4 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-[10px]"
                      title="Aumentar 5 un"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFlavor(item.id)}
                      className="w-4 h-4 rounded text-red-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center ml-0.5"
                      title="Remover sabor"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Campo de Entrada com Autocomplete Dinâmico */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setIsOpenSuggestions(true)
                  }}
                  onFocus={() => setIsOpenSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    remainingUnits > 0
                      ? `Digite ex: ${remainingUnits} churros, ${Math.min(20, remainingUnits)} ninho...`
                      : placeholder
                  }
                  className="w-full pl-3.5 pr-8 py-2 bg-white rounded-lg border border-amber-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400 shadow-2xs"
                />

                {inputValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue('')
                      setIsOpenSuggestions(false)
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (inputValue.trim()) {
                    handleAddFlavor(inputValue.trim())
                  }
                }}
                disabled={!inputValue.trim()}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs whitespace-nowrap active:scale-95"
              >
                + Adicionar
              </button>
            </div>

            {/* Dropdown Flutuante de Sugestões com Auto-complete */}
            {isOpenSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 max-h-56 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Sugestões {parsedInput.qty ? `(${parsedInput.qty} un)` : ''}</span>
                  <span className="text-[9px] font-normal text-slate-400">Toque para adicionar</span>
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {filteredSuggestions.map((flavor) => {
                    const previewQty = parsedInput.qty || (remainingUnits > 0 ? remainingUnits : 20)
                    return (
                      <button
                        key={flavor}
                        type="button"
                        onClick={() => handleAddFlavor(flavor)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50 active:bg-amber-100 rounded-lg text-xs text-slate-700 flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <span className="font-medium text-slate-800 group-hover:text-amber-900">
                          {flavor}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 group-hover:bg-amber-200/60 px-1.5 py-0.5 rounded">
                          +{previewQty} un
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Se o que foi digitado não existe exatamente nas sugestões */}
                {parsedInput.query &&
                  !allKnownFlavors.some(
                    f => f.toLowerCase() === parsedInput.query.toLowerCase()
                  ) && (
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleAddFlavor(parsedInput.query)}
                        className="w-full text-left px-2.5 py-1.5 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg text-xs text-indigo-700 flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold">
                          ✨ Adicionar novo sabor: &ldquo;{parsedInput.query}&rdquo;
                        </span>
                        <span className="text-[10px] text-indigo-600 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                          Aprender sabor
                        </span>
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Chips de Atalhos Rápidos dos Mais Populares */}
          {flavors.length === 0 && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mais pedidos no catálogo:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {popularCategoryFlavors.map((flavor) => (
                  <button
                    key={flavor}
                    type="button"
                    onClick={() => handleAddFlavor(flavor, 25)}
                    className="px-2 py-1 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-md text-[11px] font-medium text-slate-700 transition-colors shadow-2xs"
                  >
                    +25 {flavor}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
