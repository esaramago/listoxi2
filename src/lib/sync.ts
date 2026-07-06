import { writable, get } from 'svelte/store';
import { db } from './db';
import { pb, currentUser, inviteUserByEmail } from './pb';

export type SyncState = 'synced' | 'syncing' | 'offline-pending' | 'offline';

export const isOnline = writable(true);
export const syncState = writable<SyncState>('synced');

let unsubscribeRealtimeLists: (() => void) | null = null;
let unsubscribeRealtimeItems: (() => void) | null = null;

// Helper to check if there are pending offline changes
export async function hasPendingChanges(): Promise<boolean> {
	const pendingLists = await db.lists.where('sync_status').notEqual('synced').count();
	const pendingItems = await db.items.where('sync_status').notEqual('synced').count();
	return pendingLists > 0 || pendingItems > 0;
}

// Update the sync status state based on connection and pending changes
export async function updateSyncState() {
	const online = get(isOnline);
	const pending = await hasPendingChanges();

	if (!online) {
		syncState.set(pending ? 'offline-pending' : 'offline');
	} else if (pending) {
		syncState.set('offline-pending');
	} else {
		syncState.set('synced');
	}
}

// The main sync function
export async function triggerSync() {
	const online = get(isOnline);
	const user = get(currentUser);

	if (!online || !user) {
		await updateSyncState();
		return;
	}

	try {
		syncState.set('syncing');

		// 1. Sync pending local lists to remote
		const localLists = await db.lists.toArray();
		for (const list of localLists) {
			// Resolve any pending offline shared emails to user IDs first!
			let updatedSharedWith = [...list.shared_with];
			let emailsResolved = false;

			if (list.shared_emails && list.shared_emails.length > 0) {
				for (const email of list.shared_emails) {
					try {
						const userId = await inviteUserByEmail(email);
						if (!updatedSharedWith.includes(userId)) {
							updatedSharedWith.push(userId);
						}
						emailsResolved = true;
					} catch (e) {
						console.error(`Failed to resolve email ${email} during sync:`, e);
					}
				}
				if (emailsResolved) {
					await db.lists.update(list.id, {
						shared_with: updatedSharedWith,
						shared_emails: []
					});
					list.shared_with = updatedSharedWith;
					list.shared_emails = [];
					if (list.sync_status === 'synced') {
						list.sync_status = 'updated';
						await db.lists.update(list.id, { sync_status: 'updated' });
					}
				}
			}

			if (list.sync_status === 'created') {
				try {
					await pb.collection('lists').create({
						id: list.id,
						name: list.name,
						owner: list.owner,
						shared_with: list.shared_with
					});
					await db.lists.update(list.id, { sync_status: 'synced' });
				} catch (err: any) {
					// If record already exists, just update sync_status to synced
					if (err.status === 400) {
						await db.lists.update(list.id, { sync_status: 'synced' });
					} else {
						console.error('Error syncing created list:', err);
					}
				}
			} else if (list.sync_status === 'updated') {
				try {
					await pb.collection('lists').update(list.id, {
						name: list.name,
						shared_with: list.shared_with
					});
					await db.lists.update(list.id, { sync_status: 'synced' });
				} catch (err: any) {
					if (err.status === 404) {
						// Remote list was deleted, delete locally
						await db.lists.delete(list.id);
						await db.items.where('list').equals(list.id).delete();
					} else {
						console.error('Error syncing updated list:', err);
					}
				}
			} else if (list.sync_status === 'deleted') {
				try {
					await pb.collection('lists').delete(list.id);
				} catch (err: any) {
					// Ignore 404
				}
				await db.lists.delete(list.id);
				await db.items.where('list').equals(list.id).delete();
			}
		}

		// 2. Sync pending local items to remote
		const localItems = await db.items.toArray();
		for (const item of localItems) {
			if (item.sync_status === 'created') {
				try {
					await pb.collection('items').create({
						id: item.id,
						list: item.list,
						name: item.name,
						quantity: item.quantity,
						details: item.details,
						bought: item.bought
					});
					await db.items.update(item.id, { sync_status: 'synced' });
				} catch (err: any) {
					if (err.status === 400) {
						await db.items.update(item.id, { sync_status: 'synced' });
					} else {
						console.error('Error syncing created item:', err);
					}
				}
			} else if (item.sync_status === 'updated') {
				try {
					await pb.collection('items').update(item.id, {
						name: item.name,
						quantity: item.quantity,
						details: item.details,
						bought: item.bought
					});
					await db.items.update(item.id, { sync_status: 'synced' });
				} catch (err: any) {
					if (err.status === 404) {
						// Remote item was deleted, delete locally
						await db.items.delete(item.id);
					} else {
						console.error('Error syncing updated item:', err);
					}
				}
			} else if (item.sync_status === 'deleted') {
				try {
					await pb.collection('items').delete(item.id);
				} catch (err: any) {
					// Ignore 404
				}
				await db.items.delete(item.id);
			}
		}

		// 3. Fetch remote lists (owned or shared with the user)
		const remoteLists = await pb.collection('lists').getFullList({
			sort: '-created'
		});
		const remoteListIds = remoteLists.map((l) => l.id);

		// Delete local lists that are marked synced but do not exist on the remote server
		const currentLists = await db.lists.toArray();
		for (const localList of currentLists) {
			if (localList.sync_status === 'synced' && !remoteListIds.includes(localList.id)) {
				await db.lists.delete(localList.id);
				await db.items.where('list').equals(localList.id).delete();
			}
		}

		// Upsert remote lists into local IndexedDB
		for (const rList of remoteLists) {
			const existing = await db.lists.get(rList.id);
			// Only overwrite if local status is 'synced' (no offline pending edits)
			if (!existing || existing.sync_status === 'synced') {
				await db.lists.put({
					id: rList.id,
					name: rList.name,
					owner: rList.owner,
					shared_with: rList.shared_with || [],
					sync_status: 'synced',
					updated: rList.updated
				});
			}
		}

		// 4. Fetch remote items for all lists
		if (remoteListIds.length > 0) {
			// PocketBase filter helper to get items in user's lists
			const listFilter = remoteListIds.map((id) => `list="${id}"`).join('||');
			const remoteItems = await pb.collection('items').getFullList({
				filter: listFilter
			});
			const remoteItemIds = remoteItems.map((i) => i.id);

			// Delete local items that are marked synced but do not exist on remote
			const currentItems = await db.items.toArray();
			for (const localItem of currentItems) {
				// Only delete if it belongs to one of the fetched lists
				if (
					localItem.sync_status === 'synced' &&
					remoteListIds.includes(localItem.list) &&
					!remoteItemIds.includes(localItem.id)
				) {
					await db.items.delete(localItem.id);
				}
			}

			// Upsert remote items into local IndexedDB
			for (const rItem of remoteItems) {
				const existing = await db.items.get(rItem.id);
				if (!existing || existing.sync_status === 'synced') {
					await db.items.put({
						id: rItem.id,
						list: rItem.list,
						name: rItem.name,
						quantity: rItem.quantity,
						details: rItem.details || '',
						bought: rItem.bought,
						sync_status: 'synced',
						updated: rItem.updated
					});
				}
			}
		}

		// Setup realtime subscription after initial full sync
		setupRealtimeSubscriptions();
	} catch (err) {
		console.error('Sync failed:', err);
	} finally {
		await updateSyncState();
	}
}

// Subscribe to PocketBase changes in real-time
export function setupRealtimeSubscriptions() {
	const user = get(currentUser);
	if (!user) return;

	// Unsubscribe from existing ones first
	cleanupSubscriptions();

	// Subscribe to lists collection
	pb.collection('lists')
		.subscribe('*', async (e) => {
			if (e.action === 'create' || e.action === 'update') {
				// Verify if the list belongs to or is shared with the user
				const list = e.record;
				const isOwner = list.owner === user.id;
				const isShared = list.shared_with && list.shared_with.includes(user.id);

				if (isOwner || isShared) {
					const existing = await db.lists.get(list.id);
					if (!existing || existing.sync_status === 'synced') {
						await db.lists.put({
							id: list.id,
							name: list.name,
							owner: list.owner,
							shared_with: list.shared_with || [],
							sync_status: 'synced',
							updated: list.updated
						});
					}
				} else {
					// User lost access to list, delete locally
					await db.lists.delete(list.id);
					await db.items.where('list').equals(list.id).delete();
				}
			} else if (e.action === 'delete') {
				await db.lists.delete(e.record.id);
				await db.items.where('list').equals(e.record.id).delete();
			}
			await updateSyncState();
		})
		.then((unsub) => {
			unsubscribeRealtimeLists = unsub;
		});

	// Subscribe to items collection
	pb.collection('items')
		.subscribe('*', async (e) => {
			const item = e.record;
			// Verify if parent list is present locally (meaning user has access to it)
			const parentList = await db.lists.get(item.list);
			if (!parentList) return;

			if (e.action === 'create' || e.action === 'update') {
				const existing = await db.items.get(item.id);
				if (!existing || existing.sync_status === 'synced') {
					await db.items.put({
						id: item.id,
						list: item.list,
						name: item.name,
						quantity: item.quantity,
						details: item.details || '',
						bought: item.bought,
						sync_status: 'synced',
						updated: item.updated
					});
				}
			} else if (e.action === 'delete') {
				await db.items.delete(item.id);
			}
			await updateSyncState();
		})
		.then((unsub) => {
			unsubscribeRealtimeItems = unsub;
		});
}

export function cleanupSubscriptions() {
	if (unsubscribeRealtimeLists) {
		unsubscribeRealtimeLists();
		unsubscribeRealtimeLists = null;
	}
	if (unsubscribeRealtimeItems) {
		unsubscribeRealtimeItems();
		unsubscribeRealtimeItems = null;
	}
}

// Monitor connection state
if (typeof window !== 'undefined') {
	isOnline.set(navigator.onLine);

	window.addEventListener('online', async () => {
		isOnline.set(true);
		console.log('App is online, triggering sync...');
		await triggerSync();
	});

	window.addEventListener('offline', async () => {
		isOnline.set(false);
		console.log('App is offline');
		await updateSyncState();
	});

	// Periodically run check/sync every 30 seconds if online
	setInterval(async () => {
		if (get(isOnline) && get(currentUser)) {
			await triggerSync();
		}
	}, 30000);
}

// Watch user change to trigger sync or clear IndexedDB
currentUser.subscribe(async (user) => {
	if (user) {
		await triggerSync();
	} else {
		// Logged out, clear database local cache to prevent data exposure between logins
		cleanupSubscriptions();
		await db.lists.clear();
		await db.items.clear();
		await updateSyncState();
	}
});
