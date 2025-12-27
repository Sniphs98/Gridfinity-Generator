import cv from '@techstark/opencv-js';

export function detectEdges(imageDataUrl: string | null): string | null {
	if (!cv) {
		console.error('OpenCV is not loaded');
		return null;
	}

	if (!imageDataUrl) {
		console.error('No image provided');
		return null;
	}

	try {
		// Create an image element from the data URL
		const img = new Image();
		img.src = imageDataUrl;

		img.onload = () => {
			// Create canvas to get image data
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			ctx.drawImage(img, 0, 0);

			// Convert to OpenCV Mat
			const src = cv.imread(canvas);
			const gray = new cv.Mat();
			const edges = new cv.Mat();

			// Convert to grayscale
			cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

			// Apply Canny edge detection
			cv.Canny(gray, edges, 50, 150);

			// Display result
			cv.imshow(canvas, edges);

			// Clean up
			src.delete();
			gray.delete();
			edges.delete();

			console.log('Edge detection completed!');
		};

		return imageDataUrl;
	} catch (error) {
		console.error('Error in edge detection:', error);
		return null;
	}
}