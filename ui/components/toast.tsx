'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface IToast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface IToastContextType {
  toasts: IToast[];
  addToast: (toast: Omit<IToast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<IToastContextType | undefined>(undefined);

// Toast Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<IToast[]>([]);

    const addToast = (toast: Omit<IToast, 'id'>) => {
        const id = Date.now().toString();
        const newToast: IToast = {
        id,
        duration: 10000, // Default 10 seconds
        ...toast,
        };
        
        setToasts(prev => [...prev, newToast]);

        // Auto-remove toast after duration
        if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
            removeToast(id);
        }, newToast.duration);
        }
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    );
}

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    
    const { addToast } = context;
    
    return {
        toast: (toast: Omit<IToast, 'id'>) => addToast(toast),
        success: (message: string, title?: string) => addToast({ type: 'success', message, title }),
        error: (message: string, title?: string) => addToast({ type: 'error', message, title }),
        warning: (message: string, title?: string) => addToast({ type: 'warning', message, title }),
        info: (message: string, title?: string) => addToast({ type: 'info', message, title }),
    };
}

// Toast Container Component
function ToastContainer() {
    const context = useContext(ToastContext);
    if (!context) return null;

    const { toasts, removeToast } = context;

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
}

// Individual Toast Item Component
function ToastItem(
    { toast, onRemove }: { toast: IToast; onRemove: (id: string) => void }
) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleRemove = () => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 150); // Wait for animation
    };

    const getToastStyles = () => {
        const baseStyles = "flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-200 transform";
        const visibilityStyles = isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0";
        
        switch (toast.type) {
        case 'success':
            return `${baseStyles} ${visibilityStyles} bg-green-50 border-green-200 text-green-800`;
        case 'error':
            return `${baseStyles} ${visibilityStyles} bg-red-50 border-red-200 text-red-800`;
        case 'warning':
            return `${baseStyles} ${visibilityStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
        case 'info':
            return `${baseStyles} ${visibilityStyles} bg-blue-50 border-blue-200 text-blue-800`;
        default:
            return `${baseStyles} ${visibilityStyles} bg-gray-50 border-gray-200 text-gray-800`;
        }
    };

    const getIcon = () => {
        const iconClass = "h-5 w-5 flex-shrink-0";
        switch (toast.type) {
        case 'success':
            return <CheckCircle className={`${iconClass} text-green-600`} />;
        case 'error':
            return <AlertCircle className={`${iconClass} text-red-600`} />;
        case 'warning':
            return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
        case 'info':
            return <Info className={`${iconClass} text-blue-600`} />;
        default:
            return <Info className={`${iconClass} text-gray-600`} />;
        }
    };

    return (
        <div className={getToastStyles()}>
            {getIcon()}
        <div className="flex-1 min-w-0">
            {toast.title && (
                <h4 className="font-medium text-sm mb-1">{toast.title}</h4>
            )}
            <p className="text-sm">{toast.message}</p>
        </div>
        <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
            aria-label="Close toast"
        >
            <X className="h-4 w-4" />
        </button>
        </div>
    );
}
