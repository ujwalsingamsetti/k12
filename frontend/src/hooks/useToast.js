import { useToast as useToastContext } from '../context/ToastContext';

/**
 * Reusable toast notification hook
 */
export function useToast() {
  return useToastContext();
}

export default useToast;
