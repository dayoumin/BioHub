import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineErrorProps {
    message: string;
    onRetry?: () => void;
    className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
    return (
        <div className={cn(
            "flex items-start gap-3 p-4 rounded-xl border border-error-border bg-error-bg animate-in fade-in slide-in-from-top-2 duration-300",
            className
        )}>
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-medium text-error leading-relaxed">
                    {message}
                </p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-2 text-xs font-semibold text-error/80 hover:text-error underline underline-offset-2 transition-colors"
                    >
                        다시 시도하기
                    </button>
                )}
            </div>
        </div>
    );
}
