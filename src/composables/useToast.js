import { ref } from 'vue';

const toasts = ref([]);
let idSeq = 0;

export function useToast() {
  const push = (message, type = 'info', duration = 4000) => {
    const id = ++idSeq;
    toasts.value = [...toasts.value, { id, message, type }];
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  };

  const dismiss = (id) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  return { toasts, push, dismiss };
}
