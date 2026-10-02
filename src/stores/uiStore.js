import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Toast 상태
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // Confirm 모달 상태
  confirmModal: { isOpen: false, title: '', message: '', onConfirm: null },
  openConfirm: ({ title, message, onConfirm }) =>
    set({ confirmModal: { isOpen: true, title, message, onConfirm } }),
  closeConfirm: () =>
    set({ confirmModal: { isOpen: false, title: '', message: '', onConfirm: null } }),
}));