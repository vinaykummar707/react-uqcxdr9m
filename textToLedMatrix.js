const express = require('express');
const { createCanvas, registerFont } = require('canvas');
const router = express.Router();

// Register local fonts
const registerLocalFonts = () => {
  // Add your local font paths here
  registerFont('./telugu', { family: 'Noto Sans Telugu' });
  registerFont('./mangal', { family: 'Mangal' });
  // Add more fonts as needed
};

// Initialize fonts
registerLocalFonts();

router.post('/convert', (req, res) => {
  const {
    text = 'Enter your text here',
    fontSize = 24,
    fontWeight = 'normal',
    fontFamily = 'Arial',
    textColor = '#000000',
    backgroundColor = '#FFFFFF',
    ledRows = 16,
    brightnessThreshold = 128,
    matrixChars = { dark: '#', light: '.' },
    contrastEnhanced = false,
    invert = false
  } = req.body;

  try {
    // Create canvas
    const canvas = createCanvas(800, 200); // Initial size
    const ctx = canvas.getContext('2d');

    // Set font properties
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Measure text dimensions
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    // Add padding
    const verticalPadding = fontSize * 0.5;
    const horizontalPadding = 40;

    // Adjust canvas size
    canvas.width = textWidth + horizontalPadding;
    canvas.height = textHeight + verticalPadding * 2;

    // Reset context after resize
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = textColor;
    ctx.fillText(text, horizontalPadding/2, canvas.height/2);

    // Convert to LED matrix
    const ledMatrix = convertToLEDMatrix(ctx, canvas, {
      ledRows,
      brightnessThreshold,
      matrixChars,
      contrastEnhanced,
      invert
    });

    res.json({ 
      success: true, 
      matrix: ledMatrix.split('\n'),
      dimensions: {
        rows: ledRows,
        columns: ledMatrix.split('\n')[0].length
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

function convertToLEDMatrix(ctx, canvas, options) {
  const { ledRows, brightnessThreshold, matrixChars, contrastEnhanced, invert } = options;
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imgData;

  // Apply contrast enhancement if selected
  if (contrastEnhanced) {
    enhanceContrast(data);
  }

  // Find text bounds
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const isText = invert ? brightness >= brightnessThreshold : brightness < (255 - brightnessThreshold);

      if (isText) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Calculate dimensions
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const aspectRatio = cropWidth / cropHeight;
  const targetWidth = Math.round(ledRows * aspectRatio * 1.2);

  // Create matrix
  const matrix = [];
  for (let y = 0; y < ledRows; y++) {
    let row = '';
    for (let x = 0; x < targetWidth; x++) {
      const sourceX = Math.floor(x * cropWidth / targetWidth) + minX;
      const sourceY = Math.floor(y * cropHeight / ledRows) + minY;
      const i = (sourceY * width + sourceX) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const isDark = invert ? brightness >= brightnessThreshold : brightness < (255 - brightnessThreshold);
      row += isDark ? matrixChars.dark : matrixChars.light;
    }
    matrix.push(row);
  }

  return matrix.join('\n');
}

function enhanceContrast(data) {
  let min = 255, max = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    min = Math.min(min, brightness);
    max = Math.max(max, brightness);
  }

  const range = max - min;
  if (range === 0) return;

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      data[i + j] = ((data[i + j] - min) / range) * 255;
    }
  }
}

module.exports = router;