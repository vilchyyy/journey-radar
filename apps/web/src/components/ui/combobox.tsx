'use client'

import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option...',
  className,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [filteredOptions, setFilteredOptions] = React.useState(options)

  React.useEffect(() => {
    const filtered = options.filter((option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()),
    )
    setFilteredOptions(filtered)
  }, [inputValue, options])

  React.useEffect(() => {
    if (value) {
      const selectedOption = options.find((option) => option.value === value)
      if (selectedOption) {
        setInputValue(selectedOption.label)
      }
    }
  }, [value, options])

  const handleSelect = (option: ComboboxOption) => {
    setInputValue(option.label)
    onValueChange?.(option.value)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none cursor-pointer"
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="relative flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => handleSelect(option)}
                >
                  <span className="flex-1">{option.label}</span>
                  {value === option.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Export individual components for composition
export {
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopover,
  ComboboxTrigger,
} from './combobox'
