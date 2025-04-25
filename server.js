const express = require('express');
const { createCanvas } = require('canvas');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/convert', async (req, res) => {
  try {
    const {
      text = 'Test',
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

    // Create canvas
    const canvas = createCanvas(1000, 200);
    const ctx = canvas.getContext('2d');

    // Set font properties
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Measure text dimensions
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    
    // Adjust canvas size
    const verticalPadding = fontSize * 0.5;
    const horizontalPadding = 40;
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

    // Get image data
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    // Apply contrast enhancement if selected
    if (contrastEnhanced) {
      enhanceContrast(data);
    }

    // Convert to LED matrix
    const result = convertToLEDMatrix(
      data,
      width,
      height,
      ledRows,
      brightnessThreshold,
      matrixChars,
      invert
    );

    res.json({
      matrix: result.matrix,
      dimensions: {
        rows: result.rows,
        columns: result.columns
      },
      formats: {
        text: result.matrix.join('\n'),
        c: generateCFormat(result),
        python: generatePythonFormat(result),
        arduino: generateArduinoFormat(result)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
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

function convertToLEDMatrix(data, width, height, ledRows, brightnessThreshold, matrixChars, invert) {
  // ... (copy the conversion logic from your React component)
  // Return matrix array and dimensions
}

function generateCFormat(result) {
  // ... (copy the C format generation logic)
}

function generatePythonFormat(result) {
  // ... (copy the Python format generation logic)
}

function generateArduinoFormat(result) {
  // ... (copy the Arduino format generation logic)
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});