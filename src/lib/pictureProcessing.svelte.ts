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
const OBJECT_MIN_AREA = 1000; // Minimum area for object detection
const PIXELS_PER_MM_A4_WIDTH = 8; // Approximation: will be calculated based on detected A4 width

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

// Helper: Order points for perspective transform (top-left, top-right, bottom-right, bottom-left)
function orderPoints(points: any): number[][] {
	const pts = [];
	for (let i = 0; i < points.rows; i++) {
		pts.push([points.data32F[i * 2], points.data32F[i * 2 + 1]]);
	}

	// Sort by y-coordinate
	pts.sort((a, b) => a[1] - b[1]);

	// Top two points
	const top = pts.slice(0, 2).sort((a, b) => a[0] - b[0]);
	// Bottom two points
	const bottom = pts.slice(2, 4).sort((a, b) => a[0] - b[0]);

	return [top[0], top[1], bottom[1], bottom[0]]; // TL, TR, BR, BL
}

// Helper: Apply perspective transform to get bird's eye view
function perspectiveTransform(src: any, contour: any): any {
	const rect = orderPoints(contour);

	// Calculate width and height of the new image
	const widthA = Math.sqrt(
		Math.pow(rect[2][0] - rect[3][0], 2) + Math.pow(rect[2][1] - rect[3][1], 2)
	);
	const widthB = Math.sqrt(
		Math.pow(rect[1][0] - rect[0][0], 2) + Math.pow(rect[1][1] - rect[0][1], 2)
	);
	const maxWidth = Math.max(widthA, widthB);

	const heightA = Math.sqrt(
		Math.pow(rect[1][0] - rect[2][0], 2) + Math.pow(rect[1][1] - rect[2][1], 2)
	);
	const heightB = Math.sqrt(
		Math.pow(rect[0][0] - rect[3][0], 2) + Math.pow(rect[0][1] - rect[3][1], 2)
	);
	const maxHeight = Math.max(heightA, heightB);

	// Destination points for the transform
	const dst = cv.matFromArray(4, 1, cv.CV_32FC2, [
		0,
		0,
		maxWidth - 1,
		0,
		maxWidth - 1,
		maxHeight - 1,
		0,
		maxHeight - 1
	]);

	// Source points
	const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
		rect[0][0],
		rect[0][1],
		rect[1][0],
		rect[1][1],
		rect[2][0],
		rect[2][1],
		rect[3][0],
		rect[3][1]
	]);

	// Get perspective transform matrix
	const M = cv.getPerspectiveTransform(srcPoints, dst);

	// Apply the transform
	const warped = new cv.Mat();
	const dsize = new cv.Size(maxWidth, maxHeight);
	cv.warpPerspective(src, warped, M, dsize);

	// Clean up
	dst.delete();
	srcPoints.delete();
	M.delete();

	return warped;
}

export interface ObjectMeasurement {
	widthMm: number;
	heightMm: number;
	areaMm2: number;
	imageUrl: string;
	debugImages?: {
		warped: string;
		equalized: string;
		thresh: string;
		edges: string;
		combined: string;
		closed: string;
	};
}

export async function detectObjectOnA4(
	imageDataUrl: string | null
): Promise<ObjectMeasurement | null> {
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
	let a4Contour: any = null;
	let warped: any = null;
	let warpedGray: any = null;
	let warpedEdges: any = null;
	let objectContours: any = null;
	let objectHierarchy: any = null;
	let closed: any = null;

	try {
		const loadResult = await loadImageToMat(imageDataUrl);
		src = loadResult.mat;
		const canvas = loadResult.canvas;
		const preprocessed = preprocessForContours(src);
		gray = preprocessed.gray;
		edges = preprocessed.edges;

		// Step 1: Find A4 sheet
		contours = new cv.MatVector();
		hierarchy = new cv.Mat();
		cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		let maxArea = 0;
		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);

			if (area < MIN_CONTOUR_AREA) continue;

			const peri = cv.arcLength(contour, true);
			const approx = new cv.Mat();

			try {
				cv.approxPolyDP(contour, approx, CONTOUR_APPROX_EPSILON * peri, true);

				if (approx.rows === 4) {
					const rect = cv.boundingRect(approx);
					const aspectRatio = Math.min(rect.width, rect.height) / Math.max(rect.width, rect.height);

					if (
						Math.abs(aspectRatio - A4_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE ||
						Math.abs(aspectRatio - 1 / A4_ASPECT_RATIO) < ASPECT_RATIO_TOLERANCE
					) {
						if (area > maxArea) {
							maxArea = area;
							if (a4Contour) a4Contour.delete();
							a4Contour = approx.clone();
						}
					}
				}
			} finally {
				approx.delete();
			}
		}

		if (!a4Contour) {
			console.warn('No A4 sheet detected');
			return null;
		}

		console.log('A4 sheet found, extracting region...');

		// Step 2: Get bounding rectangle instead of perspective transform
		const a4BoundingRect = cv.boundingRect(a4Contour);
		console.log('A4 bounding rect:', a4BoundingRect);

		// Extract the region using ROI (Region of Interest)
		const roi = new cv.Rect(
			a4BoundingRect.x,
			a4BoundingRect.y,
			a4BoundingRect.width,
			a4BoundingRect.height
		);
		warped = src.roi(roi);

		// Debug: Save warped image
		const debugCanvas1 = document.createElement('canvas');
		debugCanvas1.width = warped.cols;
		debugCanvas1.height = warped.rows;
		cv.imshow(debugCanvas1, warped);
		const debugWarped = debugCanvas1.toDataURL('image/png');

		// Calculate pixels per mm based on the warped A4 dimensions
		// We know the warped image should represent an A4 sheet
		const warpedWidth = warped.cols;
		const warpedHeight = warped.rows;
		// Determine if A4 is landscape or portrait based on dimensions
		const isLandscape = warpedWidth > warpedHeight;
		const a4WidthInImage = isLandscape ? warpedWidth : warpedHeight;
		const a4RealWidth = isLandscape ? A4_HEIGHT : A4_WIDTH; // A4 longer side
		const pixelsPerMm = a4WidthInImage / a4RealWidth;

		// Step 3: Detect object on the warped A4 sheet
		warpedGray = new cv.Mat();
		cv.cvtColor(warped, warpedGray, cv.COLOR_RGBA2GRAY);

		// Enhance contrast first
		const equalized = new cv.Mat();
		cv.equalizeHist(warpedGray, equalized);

		// Try multiple detection methods
		// Method 1: Simple binary threshold (Otsu's method)
		const thresh = new cv.Mat();
		cv.threshold(warpedGray, thresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

		// Method 1b: Also try adaptive threshold as backup
		const adaptiveThresh = new cv.Mat();
		cv.adaptiveThreshold(
			warpedGray,
			adaptiveThresh,
			255,
			cv.ADAPTIVE_THRESH_MEAN_C,
			cv.THRESH_BINARY_INV,
			15,
			10
		);

		// Debug: Save equalized image BEFORE deleting
		const debugCanvas2 = document.createElement('canvas');
		debugCanvas2.width = equalized.cols;
		debugCanvas2.height = equalized.rows;
		cv.imshow(debugCanvas2, equalized);
		const debugEqualized = debugCanvas2.toDataURL('image/png');

		// Method 2: Canny edge detection
		const blurred = new cv.Mat();
		cv.GaussianBlur(warpedGray, blurred, new cv.Size(5, 5), 0);
		warpedEdges = new cv.Mat();
		cv.Canny(blurred, warpedEdges, 20, 80);
		blurred.delete();
		equalized.delete();

		// Debug: Save threshold image
		const debugCanvas3 = document.createElement('canvas');
		debugCanvas3.width = thresh.cols;
		debugCanvas3.height = thresh.rows;
		cv.imshow(debugCanvas3, thresh);
		const debugThresh = debugCanvas3.toDataURL('image/png');

		// Debug: Save edges image
		const debugCanvas4 = document.createElement('canvas');
		debugCanvas4.width = warpedEdges.cols;
		debugCanvas4.height = warpedEdges.rows;
		cv.imshow(debugCanvas4, warpedEdges);
		const debugEdges = debugCanvas4.toDataURL('image/png');

		// Combine all three methods using bitwise OR
		const combined1 = new cv.Mat();
		cv.bitwise_or(thresh, adaptiveThresh, combined1);
		const combined = new cv.Mat();
		cv.bitwise_or(combined1, warpedEdges, combined);
		combined1.delete();
		adaptiveThresh.delete();

		// Debug: Save combined image
		const debugCanvas5 = document.createElement('canvas');
		debugCanvas5.width = combined.cols;
		debugCanvas5.height = combined.rows;
		cv.imshow(debugCanvas5, combined);
		const debugCombined = debugCanvas5.toDataURL('image/png');

		// Apply morphological operations to clean up the image
		const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
		closed = new cv.Mat();
		cv.morphologyEx(combined, closed, cv.MORPH_CLOSE, kernel);
		kernel.delete();
		combined.delete();

		// Debug: Save closed image
		const debugCanvas6 = document.createElement('canvas');
		debugCanvas6.width = closed.cols;
		debugCanvas6.height = closed.rows;
		cv.imshow(debugCanvas6, closed);
		const debugClosed = debugCanvas6.toDataURL('image/png');

		// Find contours of objects on the A4 sheet
		objectContours = new cv.MatVector();
		objectHierarchy = new cv.Mat();
		cv.findContours(closed, objectContours, objectHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		console.log(`Found ${objectContours.size()} contours on A4 sheet`);

		// Find the largest object (excluding the border)
		let largestObjectContour = null;
		let largestObjectArea = 0;

		// Calculate warped image area for comparison
		const warpedImageArea = warped.cols * warped.rows;
		// Use smaller threshold - 0.5% of image area
		const minAreaThreshold = Math.min(OBJECT_MIN_AREA, warpedImageArea * 0.005);
		const maxAreaThreshold = warpedImageArea * 0.9; // Max 90% of image

		for (let i = 0; i < objectContours.size(); i++) {
			const contour = objectContours.get(i);
			const area = cv.contourArea(contour);

			console.log(`Contour ${i}: area = ${area}, min threshold = ${minAreaThreshold}, max threshold = ${maxAreaThreshold}`);

			// Filter out very small contours and very large ones (likely the border)
			if (area > minAreaThreshold && area < maxAreaThreshold) {
				if (area > largestObjectArea) {
					largestObjectArea = area;
					if (largestObjectContour) largestObjectContour.delete();
					largestObjectContour = contour.clone();
				}
			}
		}

		// Draw the result
		const result = warped.clone();
		let measurements: ObjectMeasurement | null = null;

		if (largestObjectContour) {
			// Get bounding rectangle for measurements
			const boundingRect = cv.boundingRect(largestObjectContour);

			// Calculate real-world dimensions in mm
			const widthMm = Math.round((boundingRect.width / pixelsPerMm) * 10) / 10;
			const heightMm = Math.round((boundingRect.height / pixelsPerMm) * 10) / 10;
			const areaMm2 = Math.round((largestObjectArea / (pixelsPerMm * pixelsPerMm)) * 10) / 10;

			// Draw contour in green
			const color = new cv.Scalar(0, 255, 0, 255); // Green
			const contoursVec = new cv.MatVector();
			contoursVec.push_back(largestObjectContour);
			cv.drawContours(result, contoursVec, 0, color, 3);

			// Draw bounding rectangle in blue
			const rectColor = new cv.Scalar(255, 0, 0, 255); // Blue
			const topLeft = new cv.Point(boundingRect.x, boundingRect.y);
			const bottomRight = new cv.Point(
				boundingRect.x + boundingRect.width,
				boundingRect.y + boundingRect.height
			);
			cv.rectangle(result, topLeft, bottomRight, rectColor, 2);

			// Draw measurements as text
			const textColor = new cv.Scalar(255, 255, 0, 255); // Yellow
			const font = cv.FONT_HERSHEY_SIMPLEX;
			const scale = 1.5;
			const thickness = 2;

			// Width label (top)
			cv.putText(
				result,
				`${widthMm} mm`,
				new cv.Point(boundingRect.x + boundingRect.width / 2 - 50, boundingRect.y - 10),
				font,
				scale,
				textColor,
				thickness
			);

			// Height label (right side)
			cv.putText(
				result,
				`${heightMm} mm`,
				new cv.Point(boundingRect.x + boundingRect.width + 10, boundingRect.y + boundingRect.height / 2),
				font,
				scale,
				textColor,
				thickness
			);

			contoursVec.delete();
			largestObjectContour.delete();

			console.log(`Object detected: ${widthMm}mm x ${heightMm}mm, Area: ${areaMm2}mm²`);

			// Show result
			cv.imshow(canvas, result);
			const resultImageUrl = canvas.toDataURL('image/png');

			measurements = {
				widthMm,
				heightMm,
				areaMm2,
				imageUrl: resultImageUrl,
				debugImages: {
					warped: debugWarped,
					equalized: debugEqualized,
					thresh: debugThresh,
					edges: debugEdges,
					combined: debugCombined,
					closed: debugClosed
				}
			};
		} else {
			console.warn('No object detected on A4 sheet');

			// Show the processed image for debugging
			cv.imshow(canvas, closed);
			const debugImageUrl = canvas.toDataURL('image/png');

			// Return a debug result with zero measurements
			measurements = {
				widthMm: 0,
				heightMm: 0,
				areaMm2: 0,
				imageUrl: debugImageUrl,
				debugImages: {
					warped: debugWarped,
					equalized: debugEqualized,
					thresh: debugThresh,
					edges: debugEdges,
					combined: debugCombined,
					closed: debugClosed
				}
			};
		}

		// Clean up
		result.delete();
		thresh.delete();

		return measurements;
	} catch (error) {
		console.error('Error in object detection:', error);
		return null;
	} finally {
		// Clean up - always executed
		if (closed) closed.delete();
		if (objectContours) objectContours.delete();
		if (objectHierarchy) objectHierarchy.delete();
		if (warpedEdges) warpedEdges.delete();
		if (warpedGray) warpedGray.delete();
		if (warped) warped.delete();
		if (a4Contour) a4Contour.delete();
		if (contours) contours.delete();
		if (hierarchy) hierarchy.delete();
		if (src) src.delete();
		if (gray) gray.delete();
		if (edges) edges.delete();
	}
}
