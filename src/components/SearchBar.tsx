'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
}

export default function SearchBar({ onSearch, placeholder = '搜索文章...', debounceMs = 300 }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSearch = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onSearch(value)
    }, debounceMs)
  }, [onSearch, debounceMs])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleClear = () => {
    setQuery('')
    if (timerRef.current) clearTimeout(timerRef.current)
    onSearch('')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (timerRef.current) clearTimeout(timerRef.current); onSearch(query) }} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            debouncedSearch(e.target.value)
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 pr-20 text-gray-900 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
        />

        {/* 搜索图标 */}
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* 清除按钮 */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  )
}
