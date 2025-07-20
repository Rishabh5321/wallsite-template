import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import nearestColor from 'nearest-color';
import os from 'os';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../wallpapers');
const WEBP_DIR = path.resolve(__dirname, '../public/webp');
const LQIP_DIR = path.resolve(__dirname, '../public/lqip');
const GALLERY_DATA_FILE = path.resolve(
	__dirname,
	'../public/gallery-data.json'
);

const IMG_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'];
const RESPONSIVE_WIDTHS = [640, 1920];
const WEBP_QUALITY = 78;
const LQIP_QUALITY = 20;
const LQIP_WIDTH = 40;
const CONCURRENCY_LIMIT = Math.min(os.cpus().length, 4); // Limit for Vercel

const colorMap = {
	black: '#000000',
	blue: '#0000ff',
	brown: '#a52a2a',
	cyan: '#00ffff',
	green: '#008000',
	gray: '#808080',
	magenta: '#ff00ff',
	orange: '#ffa500',
	pink: '#ffc0cb',
	purple: '#800080',
	red: '#ff0000',
	white: '#ffffff',
	yellow: '#ffff00',
	maroon: '#800000',
	navy: '#000080',
	olive: '#808000',
	teal: '#008080',
	aqua: '#00ffff',
	lime: '#00ff00',
	silver: '#c0c0c0',
	fuchsia: '#ff00ff',
	indigo: '#4b0082',
	gold: '#ffd700',
	violet: '#ee82ee',
	beige: '#f5f5dc',
	tan: '#d2b48c',
	khaki: '#f0e68c',
	salmon: '#fa8072',
	coral: '#ff7f50',
	turquoise: '#40e0d0',
	plum: '#dda0dd',
	orchid: '#da70d6',
	skyblue: '#87ceeb',
};
const getColorName = nearestColor.from(colorMap);

// --- Helper Functions ---

async function findFiles(dir) {
	let files = [];
	try {
		const items = await fs.readdir(dir, { withFileTypes: true });
		for (const item of items) {
			const fullPath = path.join(dir, item.name);
			if (item.isDirectory()) {
				files = files.concat(await findFiles(fullPath));
			} else if (
				IMG_EXTENSIONS.includes(
					path.extname(item.name).toLowerCase()
				) ||
				path.extname(item.name).toLowerCase() === '.gif'
			) {
				files.push(fullPath);
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dir}:`, error.message);
	}
	return files;
}

async function needsRegeneration(srcPath, destPath) {
	try {
		const [srcStat, destStat] = await Promise.all([
			fs.stat(srcPath),
			fs.stat(destPath),
		]);
		return srcStat.mtime > destStat.mtime;
	} catch (err) {
		if (err.code === 'ENOENT') return true;
		throw err;
	}
}

async function loadGalleryData() {
	try {
		const data = await fs.readFile(GALLERY_DATA_FILE, 'utf-8');
		const parsed = JSON.parse(data);
		return {
			cache: parsed.cache || {},
			galleryData: parsed.galleryData || [],
		};
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log('No existing gallery data found, starting fresh');
			return { cache: {}, galleryData: [] };
		}
		console.error('Error loading gallery data:', error.message);
		return { cache: {}, galleryData: [] };
	}
}

async function saveGalleryData(data) {
	try {
		await fs.writeFile(GALLERY_DATA_FILE, JSON.stringify(data, null, 2));
		console.log(`Gallery data saved with ${data.galleryData.length} items`);
	} catch (error) {
		console.error('Error saving gallery data:', error.message);
		throw error;
	}
}

async function ensureDirectory(dirPath) {
	try {
		await fs.mkdir(dirPath, { recursive: true });
	} catch (error) {
		if (error.code !== 'EEXIST') {
			console.error(
				`Error creating directory ${dirPath}:`,
				error.message
			);
			throw error;
		}
	}
}

async function processImage(imgPath, cache) {
	const relPath = path.relative(SRC_DIR, imgPath);

	try {
		const stats = await fs.stat(imgPath);
		const cachedItem = cache[relPath];

		// Check if we can use cached data
		if (cachedItem && cachedItem.mtime === stats.mtimeMs) {
			return cachedItem.data;
		}

		const relPathDir = path.dirname(relPath);
		const fileName = path.basename(imgPath);
		const baseName = path.basename(fileName, path.extname(fileName));
		const isGif = path.extname(fileName).toLowerCase() === '.gif';

		// Handle GIF files differently
		if (isGif) {
			const image = sharp(imgPath);
			const metadata = await image.metadata();
			const encodedRelPath = relPath
				.split(path.sep)
				.map((s) => encodeURIComponent(s))
				.join('/');

			const data = {
				type: 'file',
				name: fileName,
				thumbnail: `src/${encodedRelPath}`,
				srcset: '',
				full: `src/${encodedRelPath}`,
				width: metadata.width,
				height: metadata.height,
				path: relPathDir === '.' ? '' : relPathDir,
				mtime: stats.mtimeMs,
				dominantColor: '',
				colorName: '',
			};

			cache[relPath] = { mtime: stats.mtimeMs, data };
			return data;
		}

		// Process regular images
		const image = sharp(imgPath);
		const metadata = await image.metadata();

		// Generate responsive images
		const webpTasks = RESPONSIVE_WIDTHS.map(async (width) => {
			const outDir = path.join(WEBP_DIR, relPathDir);
			await ensureDirectory(outDir);
			const outPath = path.join(outDir, `${baseName}_${width}w.webp`);

			if (await needsRegeneration(imgPath, outPath)) {
				await image
					.clone()
					.resize(width, null, {
						withoutEnlargement: true,
						fit: 'inside',
					})
					.webp({ quality: WEBP_QUALITY })
					.toFile(outPath);
			}
		});

		// Generate LQIP
		const lqipTask = (async () => {
			const lqipDir = path.join(LQIP_DIR, relPathDir);
			await ensureDirectory(lqipDir);
			const lqipPath = path.join(lqipDir, `${baseName}_lqip.webp`);

			if (await needsRegeneration(imgPath, lqipPath)) {
				await image
					.clone()
					.resize(LQIP_WIDTH, null, {
						withoutEnlargement: true,
						fit: 'inside',
					})
					.webp({ quality: LQIP_QUALITY })
					.toFile(lqipPath);
			}
		})();

		// Wait for all image processing to complete
		await Promise.all([...webpTasks, lqipTask]);

		// Extract dominant color
		const { dominant } = await image.stats();
		const dominantColor = `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`;
		const colorName = getColorName(dominantColor).name;

		// Build file paths
		const encodedRelPath = relPath
			.split(path.sep)
			.map((s) => encodeURIComponent(s))
			.join('/');
		const encodedBaseName = encodeURIComponent(baseName);
		const encodedRelPathDir =
			relPathDir === '.'
				? ''
				: relPathDir
						.split(path.sep)
						.map((s) => encodeURIComponent(s))
						.join('/');

		const srcPathPrefix = encodedRelPathDir
			? `webp/${encodedRelPathDir}/${encodedBaseName}`
			: `webp/${encodedBaseName}`;
		const lqipPathPrefix = encodedRelPathDir
			? `lqip/${encodedRelPathDir}/${encodedBaseName}`
			: `lqip/${encodedBaseName}`;

		const srcset = RESPONSIVE_WIDTHS.map(
			(w) => `${srcPathPrefix}_${w}w.webp ${w}w`
		).join(', ');

		const data = {
			type: 'file',
			name: fileName,
			thumbnail: `${srcPathPrefix}_640w.webp`,
			srcset: srcset,
			full: `src/${encodedRelPath}`,
			lqip: `${lqipPathPrefix}_lqip.webp`,
			width: metadata.width,
			height: metadata.height,
			path: relPathDir === '.' ? '' : relPathDir,
			mtime: stats.mtimeMs,
			dominantColor,
			colorName,
		};

		cache[relPath] = { mtime: stats.mtimeMs, data };
		return data;
	} catch (error) {
		console.error(`Error processing ${imgPath}:`, error.message);
		return null;
	}
}

async function runParallel(tasks, concurrency) {
	const results = [];
	const queue = [...tasks];
	let processedCount = 0;
	let fromCacheCount = 0;
	let errors = 0;

	const updateProgress = (fromCache, hasError = false) => {
		processedCount++;
		if (fromCache) fromCacheCount++;
		if (hasError) errors++;

		const cacheStatus = `(${fromCacheCount} from cache${errors > 0 ? `, ${errors} errors` : ''})`;
		process.stdout.write(
			`\rProcessing images: ${processedCount}/${tasks.length} ${cacheStatus}`
		);
	};

	const workers = Array(concurrency)
		.fill()
		.map(async () => {
			while (queue.length > 0) {
				const task = queue.shift();
				if (task) {
					try {
						const result = await task.taskFn();
						if (result) results.push(result);
						updateProgress(task.isCached);
					} catch (error) {
						console.error(
							`\nError processing task:`,
							error.message
						);
						updateProgress(false, true);
					}
				}
			}
		});

	await Promise.all(workers);
	process.stdout.write('\n');

	if (errors > 0) {
		console.warn(`⚠ ${errors} images failed to process`);
	}

	return results;
}

// --- Main Execution ---

async function main() {
	console.log('Starting gallery generation...');

	// Ensure output directories exist
	await Promise.all([ensureDirectory(WEBP_DIR), ensureDirectory(LQIP_DIR)]);

	const { cache, galleryData: oldGalleryData } = await loadGalleryData();
	const allImages = await findFiles(SRC_DIR);

	if (allImages.length === 0) {
		console.warn('No images found in source directory');
		return;
	}

	console.log(
		`Found ${allImages.length} images to process. Using ${CONCURRENCY_LIMIT} parallel workers.`
	);

	// Prepare tasks
	const tasks = [];
	for (const imgPath of allImages) {
		const relPath = path.relative(SRC_DIR, imgPath);
		try {
			const stats = await fs.stat(imgPath);
			const cachedItem = cache[relPath];
			const isCached = cachedItem && cachedItem.mtime === stats.mtimeMs;

			tasks.push({
				taskFn: () => processImage(imgPath, cache),
				isCached,
			});
		} catch (error) {
			console.error(`Error reading ${imgPath}:`, error.message);
		}
	}

	const newGalleryData = await runParallel(tasks, CONCURRENCY_LIMIT);

	// Clean up cache entries for deleted files
	const currentPaths = new Set(
		allImages.map((img) => path.relative(SRC_DIR, img))
	);
	const cachedPaths = Object.keys(cache);
	let cleanedCount = 0;

	for (const cachedPath of cachedPaths) {
		if (!currentPaths.has(cachedPath)) {
			delete cache[cachedPath];
			cleanedCount++;
		}
	}

	if (cleanedCount > 0) {
		console.log(`Cleaned ${cleanedCount} stale cache entries`);
	}

	await saveGalleryData({ cache, galleryData: newGalleryData });

	console.log(`Successfully processed ${newGalleryData.length} images`);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
	console.log('\nReceived SIGINT, saving progress...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\nReceived SIGTERM, saving progress...');
	process.exit(0);
});

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
