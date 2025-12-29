import { writable } from "svelte/store";

export type Notification = {
  id: number;
  title: string;
  message: string;
  duration: number;
  className: string;
  type?: "error" | "success" | "info";
};

function createNotifications() {
  const { subscribe, update } = writable<Notification[]>([]);

  function push(type: "error" | "success" | "info", title: string, message: string = "", className: string = "") {
    const id = Date.now();
    const duration = type === "error" ? 16000 : 4000;
    update((n) => [...n, { id, title, message, duration, className, type }]);
    setTimeout(() => {
      update((n) => n.filter((x) => x.id !== id));
    }, duration);
  }
  const remove = (id: number) => update(n => n.filter(x => x.id !== id));

  return { subscribe, push, remove };
}

export const notifications = createNotifications();
