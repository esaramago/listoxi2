import Dexie, { type Table } from 'dexie';

export interface LocalList {
	id: string; // PocketBase compatible 15-char string
	name: string;
	owner: string;
	shared_with: string[];
	shared_emails?: string[]; // Emails queued to be shared when sync runs online
	sync_status: 'synced' | 'created' | 'updated' | 'deleted';
	updated: string; // ISO string
	emoji?: string;
	// User-specific sort order: maps userId to their sort index
	user_sort_order?: Record<string, number>;
}

export interface LocalItem {
	id: string; // PocketBase compatible 15-char string
	list: string; // List ID
	name: string;
	quantity: number;
	details: string;
	bought: boolean;
	sync_status: 'synced' | 'created' | 'updated' | 'deleted';
	updated: string; // ISO string
	created?: string; // ISO string
}

class ListoxiDatabase extends Dexie {
	lists!: Table<LocalList>;
	items!: Table<LocalItem>;

	constructor() {
		super('ListoxiDatabase');
		this.version(2).stores({
			lists: 'id, name, owner, sync_status, updated',
			items: 'id, list, name, bought, sync_status, updated'
		}).upgrade(async (tx) => {
			// Migration from v1 to v2: add user_sort_order field
			const lists = await tx.table('lists').toArray();
			for (const list of lists) {
				if (!list.user_sort_order) {
					await tx.table('lists').update(list.id, { user_sort_order: {} });
				}
			}
		});
	}
}

export const db = new ListoxiDatabase();

// Utility function to generate PocketBase-like 15-char alphanumeric IDs
export function generatePocketBaseId(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let id = '';
	for (let i = 0; i < 15; i++) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return id;
}
