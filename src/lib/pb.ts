import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';

const PB_URL = import.meta.env.DEV ? 'http://127.0.0.1:8090' : window.location.origin;

export const pb = new PocketBase(PB_URL);

// Svelte store for tracking auth state
export const currentUser = writable(pb.authStore.model);

pb.authStore.onChange((token, model) => {
	currentUser.set(model);
});

function generateRandomPassword(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
	let pass = '';
	for (let i = 0; i < 16; i++) {
		pass += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pass;
}

// Invite user by email: returns user ID if found or newly created and invited
export async function inviteUserByEmail(email: string): Promise<string> {
	try {
		const user = await pb.collection('users').getFirstListItem(`email="${email}"`);
		return user.id;
	} catch (err: any) {
		if (err.status === 404) {
			const password = generateRandomPassword();
			const username = 'user_' + Math.random().toString(36).substring(2, 10);
			
			const newUser = await pb.collection('users').create({
				email: email,
				password: password,
				passwordConfirm: password,
				username: username,
				emailVisibility: true
			});
			
			await pb.collection('users').requestPasswordReset(email);
			
			return newUser.id;
		}
		throw err;
	}
}
