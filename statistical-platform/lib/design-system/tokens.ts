/**
 * Design System Tokens
 * Centralized design values for consistent theming
 */

export const designTokens = {
  colors: {
    // Semantic colors
    primary: "hsl(var(--primary))",
    primaryForeground: "hsl(var(--primary-foreground))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    muted: "hsl(var(--muted))",
    mutedForeground: "hsl(var(--muted-foreground))",
    border: "hsl(var(--border))",
    card: "hsl(var(--card))",
    cardForeground: "hsl(var(--card-foreground))",
  },
  
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem", 
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  
  borderRadius: {
    sm: "calc(var(--radius) - 4px)",
    md: "calc(var(--radius) - 2px)", 
    lg: "var(--radius)",
    xl: "calc(var(--radius) + 4px)",
  },
  
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  }
} as const

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
  
  spss: {
    name: "SPSS Classic", 
    description: "Traditional statistical software styling",
    // Future implementation
  },
  
  rstudio: {
    name: "R Studio",
    description: "R Studio inspired design",
    // Future implementation  
  }
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