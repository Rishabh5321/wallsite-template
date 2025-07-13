import * as basicLightbox from 'basiclightbox';
import { state } from './state.js';
import { isFavorite, toggleFavorite } from './favorites.js';

let touchstartX = 0;
let touchendX = 0;
const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe

function showNextLightboxItem() {
	if (!state.lightbox || !state.lightbox.visible()) return;
	state.currentLightboxIndex =
		(state.currentLightboxIndex + 1) % state.lightboxWallpaperList.length;
	updateLightbox(state.lightboxWallpaperList[state.currentLightboxIndex]);
}

function showPrevLightboxItem() {
	if (!state.lightbox || !state.lightbox.visible()) return;
	state.currentLightboxIndex =
		(state.currentLightboxIndex - 1 + state.lightboxWallpaperList.length) %
		state.lightboxWallpaperList.length;
	updateLightbox(state.lightboxWallpaperList[state.currentLightboxIndex]);
}

function handleGesture() {
	const deltaX = touchendX - touchstartX;
	if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
		if (touchendX < touchstartX) {
			showNextLightboxItem();
		}
		if (touchendX > touchstartX) {
			showPrevLightboxItem();
		}
	}
}

export function showLightbox(wallpaperList, index) {
	if (!wallpaperList || wallpaperList.length === 0) return;

	state.lightboxWallpaperList = wallpaperList;
	state.currentLightboxIndex = index;
	const wallpaper = state.lightboxWallpaperList[state.currentLightboxIndex];

	if (state.lightbox) {
		if (!state.lightbox.visible()) {
			state.lightbox.show();
		}
		updateLightbox(wallpaper);
		return;
	}

	const content = createLightboxContent(wallpaper);
	state.lightbox = basicLightbox.create(content, {
		onShow: instance => {
			const lightboxElement = instance.element();
			const placeholder = lightboxElement.querySelector(
				'.basicLightbox__placeholder',
			);

			// Move controls into the main element for better structure
			const controls = placeholder.querySelector('.lightbox-controls');
			if (controls) {
				lightboxElement.appendChild(controls);
			}

			const details = placeholder.querySelector('.lightbox-details');
			if (details) {
				lightboxElement.appendChild(details);
			}

			// Add event listeners
			const prevBtn = lightboxElement.querySelector('.lightbox-prev');
			const nextBtn = lightboxElement.querySelector('.lightbox-next');
			const closeBtn = lightboxElement.querySelector('.lightbox-close');

			if (prevBtn) prevBtn.onclick = showPrevLightboxItem;
			if (nextBtn) nextBtn.onclick = showNextLightboxItem;
			if (closeBtn) closeBtn.onclick = () => state.lightbox.close();

			// Keyboard navigation
			state.keydownHandler = e => {
				if (e.key === 'ArrowLeft') showPrevLightboxItem();
				if (e.key === 'ArrowRight') showNextLightboxItem();
				if (e.key === 'Escape') state.lightbox.close();
			};
			document.addEventListener('keydown', state.keydownHandler);

			// Touch gesture handling
			const imageContainer = lightboxElement.querySelector('.lightbox-content');
			imageContainer.addEventListener(
				'touchstart',
				e => {
					touchstartX = e.changedTouches[0].screenX;
				},
				{ passive: true },
			);

			imageContainer.addEventListener(
				'touchend',
				e => {
					touchendX = e.changedTouches[0].screenX;
					handleGesture();
				},
				{ passive: true },
			);
		},
		onClose: () => {
			document.removeEventListener('keydown', state.keydownHandler);
			// No need to remove touch listeners as the element is destroyed
		},
	});

	state.lightbox.show(() => {
		updateLightbox(wallpaper);
	});
}

function updateLightbox(wallpaper) {
	if (!state.lightbox || !wallpaper) return;

	const lightboxElement = state.lightbox.element();
	const contentElement = lightboxElement.querySelector('.lightbox-content');
	const img = contentElement.querySelector('img');
	const wallpaperName = lightboxElement.querySelector('.wallpaper-name');
	const wallpaperMeta = lightboxElement.querySelector('.wallpaper-meta'); // Updated class
	const downloadBtn = lightboxElement.querySelector('.download-btn');
	const favoriteBtn = lightboxElement.querySelector('.lightbox-favorite-btn');
	const shareBtn = lightboxElement.querySelector('.share-btn');

	contentElement.classList.add('loading');

	// Use thumbnail for initial display
	img.src = encodeURI(wallpaper.thumbnail);
	img.alt = `Thumbnail for ${wallpaper.name}`;

	wallpaperName.textContent = wallpaper.name
		.split('.')
		.slice(0, -1)
		.join('.');
	wallpaperMeta.textContent = 'Loading...'; // Placeholder text

	downloadBtn.href = encodeURI(wallpaper.full);

	favoriteBtn.classList.toggle('favorited', isFavorite(wallpaper));
	favoriteBtn.onclick = () => {
		toggleFavorite(wallpaper);
		favoriteBtn.classList.toggle('favorited');
	};

	shareBtn.onclick = () => {
		const url = new URL(wallpaper.full, window.location.href).href;
		navigator.clipboard.writeText(url).then(() => {
			const originalIcon = shareBtn.innerHTML;
			shareBtn.textContent = 'Copied!';
			setTimeout(() => {
				shareBtn.innerHTML = originalIcon;
			}, 2000);
		});
	};

	// Preload and display the full-resolution image
	const fullImage = new Image();
	fullImage.src = encodeURI(wallpaper.full);

	fullImage.onload = () => {
		if (img.src.includes(encodeURI(wallpaper.thumbnail))) {
			img.src = fullImage.src;
			img.alt = wallpaper.name.split('.').slice(0, -1).join('.');
		}
		contentElement.classList.remove('loading');

		// Update metadata
		const format = wallpaper.name.split('.').pop().toUpperCase();
		const folder = wallpaper.path || 'Root';
		wallpaperMeta.textContent = `${fullImage.naturalWidth}x${fullImage.naturalHeight} | ${format} | ${folder}`;

		// Preload adjacent images
		const nextIndex =
			(state.currentLightboxIndex + 1) % state.lightboxWallpaperList.length;
		const prevIndex =
			(state.currentLightboxIndex - 1 + state.lightboxWallpaperList.length) %
			state.lightboxWallpaperList.length;
		if (nextIndex !== state.currentLightboxIndex)
			new Image().src = encodeURI(
				state.lightboxWallpaperList[nextIndex].full,
			);
		if (prevIndex !== state.currentLightboxIndex)
			new Image().src = encodeURI(
				state.lightboxWallpaperList[prevIndex].full,
			);
	};

	fullImage.onerror = () => {
		contentElement.classList.remove('loading');
		wallpaperMeta.textContent = 'Full image failed to load.';
	};
}

function createLightboxContent(wallpaper) {
	const imageName = wallpaper.name.split('.').slice(0, -1).join('.');
	const encodedFullUrl = encodeURI(wallpaper.full);

	return `
        <div class="lightbox-main-wrapper">
            <div class="lightbox-content">
                <div class="loader"></div>
                <img src="" alt="">
            </div>
        </div>
        <div class="lightbox-details">
            <div class="wallpaper-info">
                <span class="wallpaper-name">${imageName}</span>
                <span class="wallpaper-meta"></span>
            </div>
            <div class="lightbox-actions">
                <button class="lightbox-favorite-btn" aria-label="Toggle Favorite">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <button class="share-btn" aria-label="Share Wallpaper">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/></svg>
                </button>
                <a href="${encodedFullUrl}" download class="download-btn">Download</a>
            </div>
        </div>
        <div class="lightbox-controls">
             <button class="lightbox-prev" aria-label="Previous">&lt;</button>
             <button class="lightbox-next" aria-label="Next">&gt;</button>
             <button class="lightbox-close" aria-label="Close">&times;</button>
        </div>
    `;
}
