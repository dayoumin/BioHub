import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
    variant?: 'centered' | 'inline';
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    variant = 'centered'
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-border/60 bg-muted/20 animate-fade-in",
            variant === 'centered' ? "min-h-[300px]" : "py-12",
            className
        )}>
            {Icon && (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                </div>
            )}
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            {description && (
                <p className="mt-2 text-sm text-muted-foreground max-w-[280px] mx-auto">
                    {description}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
