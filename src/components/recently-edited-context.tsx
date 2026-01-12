'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface RecentlyEditedItem {
    id: string
    name: string
    sku: string
    newPrice: number
    profit: number
    timestamp: Date
}

interface RecentlyEditedContextType {
    recentlyEdited: RecentlyEditedItem[]
    addRecentlyEdited: (item: Omit<RecentlyEditedItem, 'timestamp'>) => void
    clearRecentlyEdited: () => void
}

const RecentlyEditedContext = createContext<RecentlyEditedContextType | undefined>(undefined)

const MAX_RECENT_ITEMS = 10

export function RecentlyEditedProvider({ children }: { children: ReactNode }) {
    const [recentlyEdited, setRecentlyEdited] = useState<RecentlyEditedItem[]>([])

    const addRecentlyEdited = useCallback((item: Omit<RecentlyEditedItem, 'timestamp'>) => {
        setRecentlyEdited(prev => {
            // Remove existing entry for this product if it exists
            const filtered = prev.filter(p => p.id !== item.id)

            // Add new entry at the beginning
            const newItem: RecentlyEditedItem = {
                ...item,
                timestamp: new Date()
            }

            // Keep only the most recent items
            return [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS)
        })
    }, [])

    const clearRecentlyEdited = useCallback(() => {
        setRecentlyEdited([])
    }, [])

    return (
        <RecentlyEditedContext.Provider value={{ recentlyEdited, addRecentlyEdited, clearRecentlyEdited }}>
            {children}
        </RecentlyEditedContext.Provider>
    )
}

export function useRecentlyEdited() {
    const context = useContext(RecentlyEditedContext)
    if (context === undefined) {
        throw new Error('useRecentlyEdited must be used within a RecentlyEditedProvider')
    }
    return context
}
