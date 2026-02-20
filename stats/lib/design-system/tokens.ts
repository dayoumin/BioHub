/**
 * Design System Tokens
 * Theme definitions for consistent component styling
 */

/**
 * Theme Definitions
 */
export const themes = {
  perplexity: {
    name: "Perplexity",
    description: "Clean, minimal design inspired by Perplexity AI",
    
    components: {
      analysisCard: {
        default: "bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200",
        hover: "hover:border-primary/20 hover:shadow-lg",
        active: "border-primary shadow-md",
        loading: "animate-pulse bg-muted/50",
      },
      
      analysisCategory: {
        header: "bg-card border border-border rounded-lg shadow-sm",
        title: "text-lg font-semibold text-foreground",
        description: "text-sm text-muted-foreground",
        badge: "bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full",
        icon: "h-6 w-6 text-foreground",
      },
      
      analysisGrid: {
        container: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        item: "group relative",
      },
      
      tabs: {
        list: "grid w-full grid-cols-6 h-12 bg-muted/30 border border-border rounded-lg p-1",
        trigger: "flex flex-col items-center gap-1 h-10 rounded-md transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm hover:bg-background/60 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground",
        content: "space-y-6",
      },
      
      button: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow hover:shadow-md transition-all duration-200",
        secondary: "bg-muted text-muted-foreground hover:bg-muted/80 border border-border hover:border-primary/20",
        ghost: "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        outline: "border border-border hover:bg-muted/50 hover:border-primary/20",
      },
      
      tooltip: {
        content: "bg-card border border-border shadow-lg rounded-md",
        arrow: "fill-card stroke-border",
      }
    }
  },
  
} as const

/**
 * Theme utilities
 */
export type ThemeName = keyof typeof themes
export type ComponentName = keyof typeof themes.perplexity.components
export type ComponentVariant<T extends ComponentName> = keyof typeof themes.perplexity.components[T]

export const getComponentStyles = <T extends ComponentName>(
  theme: ThemeName,
  component: T,
  variant: ComponentVariant<T> = 'default' as ComponentVariant<T>
): string => {
  const themeObj = themes[theme] as { components: Record<string, Record<string, string>> }
  return (themeObj.components[component as string][variant as string] as string) || ''
}

export const getCurrentTheme = () => themes.perplexity // Default theme