/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from '$service-worker'

if (import.meta.env.DEV) {
	self.addEventListener('install', () => {
		(self as any).skipWaiting()
	})

	self.addEventListener('activate', (event: any) => {
		async function clearCachesAndUnregister() {
			for (const key of await caches.keys()) {
				await caches.delete(key)
			}
			await (self as any).registration.unregister()
			console.log('Service worker unregistered and caches cleared in dev mode.')
		}
		event.waitUntil(clearCachesAndUnregister())
	})
} else {
	const CACHE = `cache-${version}`

	const ASSETS = [
		...build,
		...files,
		...prerendered
	]

	self.addEventListener('install', (event: any) => {
		async function addFilesToCache() {
			const cache = await caches.open(CACHE)
			await cache.addAll(ASSETS)
		}

		event.waitUntil(addFilesToCache())
	})

	self.addEventListener('activate', (event: any) => {
		async function deleteOldCaches() {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key)
			}
		}

		event.waitUntil(deleteOldCaches())
	})

	self.addEventListener('fetch', (event: any) => {
		if (event.request.method !== 'GET') return

		const url = new URL(event.request.url)

		// Don't intercept pocketbase requests
		if (url.port === '8090' || url.pathname.includes('/api/')) {
			return
		}

		const isHTML = event.request.headers.get('accept')?.includes('text/html')

		if (isHTML) {
			event.respondWith(
				caches.match('/index.html').then((response) => {
					return response || fetch(event.request)
				})
			)
			return
		}

		event.respondWith(
			caches.match(event.request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse
				}

				return fetch(event.request).then((response) => {
					if (response.status === 200) {
						const responseClone = response.clone()
						caches.open(CACHE).then((cache) => {
							cache.put(event.request, responseClone)
						})
					}
					return response
				}).catch(() => {
					return new Response('Offline content not available', { status: 503 })
				})
			})
		)
	})
}
