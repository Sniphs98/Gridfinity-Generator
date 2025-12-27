import cv from '@techstark/opencv-js';

// Constants for image processing
const GAUSSIAN_BLUR_SIZE = 5;
const CANNY_THRESHOLD_LOW = 50;
const CANNY_THRESHOLD_HIGH = 150;
const MIN_CONTOUR_AREA = 10000;
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const A4_ASPECT_RATIO = A4_WIDTH / A4_HEIGHT; // ~0.707
const ASPECT_RATIO_TOLERANCE = 0.15;
const CONTOUR_APPROX_EPSILON = 0.02;

// Helper: Load image and convert to OpenCV Mat
async function loadImageToMat(imageDataUrl: string): Promise<{ mat: any; canvas: HTMLCanvasElement }> {
	return new Promise((resolve, reject) => {
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
				const mat = cv.imread(canvas);
				resolve({ mat, canvas });
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = () => {
			reject('Failed to load image');
		};
	});
}

// Helper: Convert image to grayscale and apply edge detection
function preprocessForContours(src: any): { gray: any; edges: any } {
	const gray = new cv.Mat();
	const edges = new cv.Mat();
	const blurred = new cv.Mat();

	// Convert to grayscale
	cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

	// Apply Gaussian blur to reduce noise
	cv.GaussianBlur(gray, blurred, new cv.Size(GAUSSIAN_BLUR_SIZE, GAUSSIAN_BLUR_SIZE), 0);

	// Apply Canny edge detection
	cv.Canny(blurred, edges, CANNY_THRESHOLD_LOW, CANNY_THRESHOLD_HIGH);

	blurred.delete();

	return { gray, edges };
}

export async function detectEdges(imageDataUrl: string | null): Promise<string | null> {
	if (!cv) {
		console.error('OpenCV is not loaded');
		return null;
	}

	if (!imageDataUrl) {
		console.error('No image provided');
		return null;
	}

	let src: any = null;
	let gray: any = null;
	let edges: any = null;

	try {
		const result = await loadImageToMat(imageDataUrl);
		src = result.mat;
		const canvas = result.canvas;
		const preprocessed = preprocessForContours(src);
		gray = preprocessed.gray;
		edges = preprocessed.edges;

		// Display result on canvas
		cv.imshow(canvas, edges);

		// Convert canvas to data URL
		const processedImageUrl = canvas.toDataURL('image/png');

		console.log('Edge detection completed!');
		return processedImageUrl;
	} catch (error) {
		console.error('Error in edge detection:', error);
		return null;
	} finally {
		// Clean up - always executed
		if (src) src.delete();
		if (gray) gray.delete();
		if (edges) edges.delete();
	}
}

export async function detectA4Sheet(imageDataUrl: string | null): Promise<string | null> {
	if (!cv) {
		console.error('OpenCV is not loaded');
		return null;
	}
	if (!imageDataUrl) {
		console.error('No image provided');
		return null;
	}

	let src: any = null;
	let gray: any = null;
	let edges: any = null;
	let contours: any = null;
	let hierarchy: any = null;
	let bestContour: any = null;
	let result: any = null;

	try {
		const loadResult = await loadImageToMat(imageDataUrl);
		src = loadResult.mat;
		const canvas = loadResult.canvas;
		const preprocessed = preprocessForContours(src);
		gray = preprocessed.gray;
		edges = preprocessed.edges;

		// Find contours
		contours = new cv.MatVector();
		hierarchy = new cv.Mat();
		cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		let maxArea = 0;

		// Find the largest rectangular contour that matches A4 aspect ratio
		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);

			// Only consider large enough contours
			if (area < MIN_CONTOUR_AREA) continue;

			// Approximate the contour to a polygon
			const peri = cv.arcLength(contour, true);
			const approx = new cv.Mat();

			try {
				cv.approxPolyDP(contour, approx, CONTOUR_APPROX_EPSILON * peri, true);

				// Check if it's a quadrilateral (4 corners)
				if (approx.rows === 4) {
					// Get bounding rectangle to check aspect ratio
					const rect = cv.boundingRect(approx);
					const aspectRatio = Math.min(rect.width, rect.height) / Math.max(rect.width, rect.height);

					// Check if aspect ratio matches A4 (considering both orientations)
					if (
						Math.abs(aspectRatio - A4_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE ||
						Math.abs(aspectRatio - 1 / A4_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE
					) {
						if (area > maxArea) {
							maxArea = area;
							if (bestContour) bestContour.delete();
							bestContour = contour.clone();
						}
					}
				}
			} finally {
				approx.delete();
			}
		}

		// Draw the detected A4 sheet on the original image
		if (bestContour) {
			result = src.clone();
			const color = new cv.Scalar(0, 255, 0, 255); // Green
			const contoursVec = new cv.MatVector();
			contoursVec.push_back(bestContour);
			cv.drawContours(result, contoursVec, 0, color, 3);
			contoursVec.delete();

			// Show result
			cv.imshow(canvas, result);
			const resultImageUrl = canvas.toDataURL('image/png');

			console.log('A4 sheet detected with area:', maxArea);
			return resultImageUrl;
		} else {
			console.warn('No A4 sheet detected');

			// Show edges if no A4 found (for debugging)
			cv.imshow(canvas, edges);
			const debugImageUrl = canvas.toDataURL('image/png');

			return debugImageUrl;
		}
	} catch (error) {
		console.error('Error in A4 detection:', error);
		return null;
	} finally {
		// Clean up - always executed
		if (result) result.delete();
		if (bestContour) bestContour.delete();
		if (contours) contours.delete();
		if (hierarchy) hierarchy.delete();
		if (src) src.delete();
		if (gray) gray.delete();
		if (edges) edges.delete();
	}
}
