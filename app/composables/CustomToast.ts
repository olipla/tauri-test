export function useCustomToast() {
  const toast = useToast()

  function showToast(title: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') {
    const icons = {
      info: 'i-lucide-info',
      error: 'i-lucide-octagon-alert',
      warning: 'i-lucide-triangle-alert',
      success: 'i-lucide-check',
    }
    toast.add({
      title,
      icon: icons[type],
      color: type,
      ui: {
        title: 'text-lg',
        root: 'p-8 opacity-70',
        icon: 'size-20',
        wrapper: 'self-stretch justify-center pl-6',
      },
      duration: type === 'error' ? 30000 : 10000,
    })
  }

  return { toast, showToast }
}
