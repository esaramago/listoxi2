import Dexie, { type Table } from 'dexie';

export interface LocalList {
	id: string; // PocketBase compatible 15-char string
	name: string;
	owner: string;
	shared_with: string[];
	shared_emails?: string[]; // Emails queued to be shared when sync runs online
	sync_status: 'synced' | 'created' | 'updated' | 'deleted';
	updated: string; // ISO string
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
}

class ListoxiDatabase extends Dexie {
	lists!: Table<LocalList>;
	items!: Table<LocalItem>;

	constructor() {
		super('ListoxiDatabase');
		this.version(1).stores({
			lists: 'id, name, owner, sync_status, updated',
			items: 'id, list, name, bought, sync_status, updated'
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
