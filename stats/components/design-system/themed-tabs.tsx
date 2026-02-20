"use client"

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useComponentStyles } from '@/lib/design-system/theme-provider'
import { cn } from '@/lib/utils'

interface ThemedTabsProps {
  children: React.ReactNode
  defaultValue: string
  className?: string
}

function ThemedTabs({ children, defaultValue, className }: ThemedTabsProps) {
  const contentStyles = useComponentStyles('tabs', 'content')
  
  return (
    <Tabs defaultValue={defaultValue} className={cn(contentStyles, className)}>
      {children}
    </Tabs>
  )
}

interface ThemedTabsListProps {
  children: React.ReactNode
  className?: string
}

function ThemedTabsList({ children, className }: ThemedTabsListProps) {
  const listStyles = useComponentStyles('tabs', 'list')
  
  return (
    <TabsList className={cn(listStyles, className)}>
      {children}
    </TabsList>
  )
}

interface ThemedTabsTriggerProps {
  value: string
  icon: LucideIcon
  title: string
  className?: string
}

function ThemedTabsTrigger({ value, icon: Icon, title, className }: ThemedTabsTriggerProps) {
  const triggerStyles = useComponentStyles('tabs', 'trigger')
  
  return (
    <TabsTrigger value={value} className={cn(triggerStyles, className)}>
      <Icon className="h-4 w-4" />
      <span className="text-[10px] leading-tight text-center">{title}</span>
    </TabsTrigger>
  )
}

interface ThemedTabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

function ThemedTabsContent({ value, children, className }: ThemedTabsContentProps) {
  const contentStyles = useComponentStyles('tabs', 'content')
  
  return (
    <TabsContent value={value} className={cn(contentStyles, className)}>
      {children}
    </TabsContent>
  )
}

// Compound component assignment
ThemedTabs.List = ThemedTabsList
ThemedTabs.Trigger = ThemedTabsTrigger
ThemedTabs.Content = ThemedTabsContent

export { ThemedTabs }