import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	let theme = $state<Theme>('light');

	function updateDocumentClass() {
		if (browser) {
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}

	// Initialize theme from localStorage or system preference
	if (browser) {
		const stored = localStorage.getItem('theme') as Theme | null;
		if (stored) {
			theme = stored;
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			theme = 'dark';
		}

		// Apply theme to document
		updateDocumentClass();
	}

	return {
		get current() {
			return theme;
		},
		toggle() {
			theme = theme === 'light' ? 'dark' : 'light';
			if (browser) {
				localStorage.setItem('theme', theme);
				updateDocumentClass();
			}
		},
		set(newTheme: Theme) {
			theme = newTheme;
			if (browser) {
				localStorage.setItem('theme', theme);
				updateDocumentClass();
			}
		}
	};
}

export const themeStore = createThemeStore();
