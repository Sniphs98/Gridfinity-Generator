import cv from '@techstark/opencv-js';

export async function detectEdges(imageDataUrl: string | null): Promise<string | null> {
	if (!cv) {
		console.error('OpenCV is not loaded');
		return null;
	}

	if (!imageDataUrl) {
		console.error('No image provided');
		return null;
	}

	return new Promise((resolve, reject) => {
		try {
			// Create an image element from the data URL
			const img = new Image();
			img.src = imageDataUrl;

			img.onload = () => {
				try {
					// Create canvas to get image data
					const canvas = document.createElement('canvas');
					canvas.width = img.width;
					canvas.height = img.height;
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject('Could not get canvas context');
						return;
					}

					ctx.drawImage(img, 0, 0);

					// Convert to OpenCV Mat
					const src = cv.imread(canvas);
					const gray = new cv.Mat();
					const edges = new cv.Mat();

					// Convert to grayscale
					cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

					// Apply Canny edge detection
					cv.Canny(gray, edges, 50, 150);

					// Display result on canvas
					cv.imshow(canvas, edges);

					// Convert canvas to data URL (this is the processed image!)
					const processedImageUrl = canvas.toDataURL('image/png');

					// Clean up OpenCV matrices
					src.delete();
					gray.delete();
					edges.delete();

					console.log('Edge detection completed!');
					resolve(processedImageUrl);
				} catch (error) {
					reject(error);
				}
			};

			img.onerror = () => {
				reject('Failed to load image');
			};
		} catch (error) {
			console.error('Error in edge detection:', error);
			reject(error);
		}
	});
}