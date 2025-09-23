import * as React from "react"

export interface ToastProps {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

let toastQueue: ToastProps[] = []
let listeners: Array<(toasts: ToastProps[]) => void> = []

function notifyListeners() {
  listeners.forEach(listener => {
    listener(toastQueue)
  })
}

export function toast(props: ToastProps) {
  toastQueue = [...toastQueue, props]
  notifyListeners()

  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t !== props)
    notifyListeners()
  }, 3000)

  return {
    dismiss: () => {
      toastQueue = toastQueue.filter(t => t !== props)
      notifyListeners()
    }
  }
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  React.useEffect(() => {
    listeners.push(setToasts)
    return () => {
      listeners = listeners.filter(l => l !== setToasts)
    }
  }, [])

  return {
    toast,
    toasts,
    dismiss: (toast: ToastProps) => {
      toastQueue = toastQueue.filter(t => t !== toast)
      notifyListeners()
    }
  }
}