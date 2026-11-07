import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import axios from 'axios'

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
axios.defaults.withCredentials = true
axios.defaults.xsrfCookieName = 'csrf-token'
axios.defaults.xsrfHeaderName = 'x-csrf-token'

axios.interceptors.request.use((config) => {
  if (baseUrl && config.url && config.url.startsWith('/api/') && !config.url.startsWith(baseUrl + '/api/')) {
    config.url = baseUrl + config.url
  }
  return config
})

// Queue for holding requests while token is refreshing
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string | null) => void
  reject: (err: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error)
    }

    const url = originalRequest.url || ''
    // Do not attempt token refresh for login or refresh requests themselves
    const isAuthRoute =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/operator-login') ||
      url.includes('/api/auth/refresh')

    if (isAuthRoute || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
          }
          return axios(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshUrl = baseUrl ? `${baseUrl}/api/auth/refresh` : '/api/auth/refresh'
      const { data } = await axios.post(refreshUrl, {}, { _retry: true } as any)
      const newAccessToken = data.accessToken

      if (newAccessToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
        }
      }

      try {
        const { useAuthStore } = await import('./stores/auth')
        const auth = useAuthStore()
        if (newAccessToken) {
          auth.accessToken = newAccessToken
        }
      } catch {}

      processQueue(null, newAccessToken)
      return axios(originalRequest)
    } catch (refreshErr) {
      processQueue(refreshErr, null)

      try {
        const { useAuthStore } = await import('./stores/auth')
        const auth = useAuthStore()
        auth.user = null
        auth.accessToken = null
        delete axios.defaults.headers.common['Authorization']
      } catch {}

      if (router.currentRoute.value.meta?.requiresAuth) {
        router.push('/login')
      }

      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)

import Vue3Toastify, { type ToastContainerOptions } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.use(Vue3Toastify, {
  autoClose: 3000,
  position: 'bottom-right',
  theme: 'dark'
} as ToastContainerOptions);

app.mount('#app')
