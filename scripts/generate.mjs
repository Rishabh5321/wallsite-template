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

	// FIXED: Prepare tasks with proper cache detection
	const tasks = [];
	let cacheHitCount = 0;

	for (const imgPath of allImages) {
		const relPath = path.relative(SRC_DIR, imgPath);
		try {
			const stats = await fs.stat(imgPath);
			const cachedItem = cache[relPath];

			// FIXED: Proper cache validation
			const isCached =
				cachedItem &&
				cachedItem.mtime === stats.mtimeMs &&
				cachedItem.data &&
				cachedItem.data.name &&
				cachedItem.data.mtime;

			if (isCached) {
				cacheHitCount++;
			}

			tasks.push({
				taskFn: () => processImage(imgPath, cache),
				isCached,
			});
		} catch (error) {
			console.error(`Error reading ${imgPath}:`, error.message);
		}
	}

	console.log(
		`Cache status: ${cacheHitCount}/${allImages.length} images cached`
	);

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

	console.log(
		`Successfully processed ${newGalleryData.length} images (${cacheHitCount} from cache)`
	);
}
