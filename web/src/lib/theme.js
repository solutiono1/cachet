/* Theme choice. Three states: 'system', 'paper', 'ink'.
   Stored per browser. Every storage access is guarded: a private window or
   blocked site data must not break the page. */

const KEY = 'cachet.theme';

export function readTheme() {
	try {
		const v = localStorage.getItem(KEY);
		if (v === 'paper' || v === 'ink') return v;
	} catch {
		/* storage unavailable */
	}
	return 'system';
}

export function applyTheme(choice) {
	const root = document.documentElement;
	if (choice === 'system') root.removeAttribute('data-theme');
	else root.setAttribute('data-theme', choice);
	try {
		if (choice === 'system') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, choice);
	} catch {
		/* storage unavailable: the choice still applies for this page view */
	}
}

/** Returns the theme actually shown right now, resolving 'system'. */
export function resolved(choice) {
	if (choice !== 'system') return choice;
	try {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ink' : 'paper';
	} catch {
		return 'paper';
	}
}
