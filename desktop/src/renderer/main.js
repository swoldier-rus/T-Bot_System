import { createApp } from 'vue';
import App from './App.vue';
import './styles/main.css';

// Global helper for desktop notifications across the application
if (typeof window.triggerDesktopAlert !== 'function') {
  window.triggerDesktopAlert = function (title, body) {
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.showNotification) {
      window.electronAPI.showNotification({ title, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };
}

const app = createApp(App);
app.mount('#app');
