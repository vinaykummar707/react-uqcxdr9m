import React, { useState, useEffect, useRef } from 'react';

export default function EnhancedTextToLEDMatrix() {
  const [text, setText] = useState('Enter your text here');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [availableFonts, setAvailableFonts] = useState([
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Tahoma',
    'english','Noto Sans Telugu','hindi','mangal'
  ]);
  const [googleFonts, setGoogleFonts] = useState([
   
  ]);
  const [loadedFonts, setLoadedFonts] = useState({});
  const [ledMatrix, setLedMatrix] = useState('');
  const [ledRows, setLedRows] = useState(16);
  const [ledColumns, setLedColumns] = useState(0); // Auto-calculated
  const [brightnessThreshold, setBrightnessThreshold] = useState(128);
  const [matrixChars, setMatrixChars] = useState({ dark: '#', light: '.' });
  const [contrastEnhanced, setContrastEnhanced] = useState(false);
  const [invert, setInvert] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [matrixPreview, setMatrixPreview] = useState(true);

  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Function to load Google Fonts
  const loadGoogleFont = (font) => {
    if (loadedFonts[font]) return Promise.resolve();

    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css?family=${font.replace(
        ' ',
        '+'
      )}:400,700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      link.onload = () => {
        setLoadedFonts((prev) => ({ ...prev, [font]: true }));
        resolve();
      };
    });
  };

  // Handle font selection change
  const handleFontChange = async (e) => {
    const selectedFont = e.target.value;

    // If it's a Google font, load it first
    if (googleFonts.includes(selectedFont)) {
      await loadGoogleFont(selectedFont);
    }

    setFontFamily(selectedFont);
  };

  // Function to draw text on canvas
  const drawTextOnCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear previous content
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font properties
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Measure text dimensions with proper height calculation
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    // Use actualBoundingBoxAscent and actualBoundingBoxDescent for accurate height
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    
    // Add extra padding for regional languages
    const verticalPadding = fontSize * 0.5; // Increased padding
    const horizontalPadding = 40;

    // Adjust canvas size to fit text
    canvas.width = textWidth + horizontalPadding;
    canvas.height = textHeight + verticalPadding * 2;

    // Need to reset font after canvas resizing
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle'; // Better vertical alignment

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text centered vertically
    ctx.fillStyle = textColor;
    ctx.fillText(text, horizontalPadding/2, canvas.height/2);
  };

  // Function to download canvas as PNG
  const downloadCanvas = () => {
    const canvas = canvasRef.current;

    // Create a temporary link element
    const link = document.createElement('a');

    // Set the download attribute with a filename
    link.download = 'text-preview.png';

    // Convert the canvas to a data URL
    link.href = canvas.toDataURL('image/png');

    // Append to the document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enhanced conversion to LED matrix
  const convertToLEDMatrix = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    // Apply contrast enhancement if selected
    if (contrastEnhanced) {
      enhanceContrast(data);
    }

    // Step 1: Find text bounds (crop out background)
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

        // Detect if pixel is text or background based on threshold
        const isText = invert
          ? brightness >= brightnessThreshold
          : brightness < 255 - brightnessThreshold;

        if (isText) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Check if any text was found
    if (minX > maxX || minY > maxY) {
      setLedMatrix('No text found in canvas.');
      return;
    }

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // Step 2: Create a temporary canvas for cropping
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the cropped region to the temporary canvas
    tempCtx.putImageData(
      ctx.getImageData(minX, minY, cropWidth, cropHeight),
      0,
      0
    );

    // Step 3: Resize to fit into ledRows
    const aspectRatio = cropWidth / cropHeight;
    const targetWidth = Math.round(ledRows * aspectRatio * 1.2); // Added 20% more width
    setLedColumns(targetWidth);

    // Create final canvas with target dimensions
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = ledRows;
    const finalCtx = finalCanvas.getContext('2d');

    // Draw the resized image
    finalCtx.drawImage(tempCanvas, 0, 0, targetWidth, ledRows);

    // Get pixel data from the resized image
    const finalData = finalCtx.getImageData(0, 0, targetWidth, ledRows).data;

    // Step 4: Convert to LED matrix string
    const matrix = [];
    const binaryMatrix = [];
    for (let y = 0; y < ledRows; y++) {
      let row = '';
      let binaryRow = [];
      for (let x = 0; x < targetWidth; x++) {
        const i = (y * targetWidth + x) * 4;
        const brightness =
          (finalData[i] + finalData[i + 1] + finalData[i + 2]) / 3;
        const isDark = invert
          ? brightness >= brightnessThreshold
          : brightness < 255 - brightnessThreshold;

        row += isDark ? matrixChars.dark : matrixChars.light;
        binaryRow.push(isDark ? 1 : 0);
      }
      matrix.push(row);
      binaryMatrix.push(binaryRow);
    }

    setLedMatrix(matrix.join('\n'));

    // Draw the matrix preview if enabled
    if (matrixPreview && previewCanvasRef.current) {
      drawMatrixPreview(binaryMatrix, targetWidth, ledRows);
    }
  };

  // Function to enhance contrast in image data
  const enhanceContrast = (data) => {
    // Find min and max brightness values
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
    }

    // Apply contrast stretching
    const range = max - min;
    if (range === 0) return; // Avoid division by zero

    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        // Normalize value to 0-255 range
        data[i + j] = ((data[i + j] - min) / range) * 255;
      }
    }
  };

  // Function to draw the matrix preview
  const drawMatrixPreview = (binaryMatrix, width, height) => {
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = width * 10; // 10px per LED
    canvas.height = height * 10; // 10px per LED

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each LED
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = binaryMatrix[y][x] ? '#FF0000' : '#330000';
        ctx.fillRect(x * 10, y * 10, 9, 9); // 9x9 with 1px gap
      }
    }
  };

  // Generate different matrix formats
  const generateMatrixFormats = () => {
    if (!ledMatrix) return null;

    // Parse matrix into rows of characters
    const rows = ledMatrix.split('\n');
    const numRows = rows.length;
    const numCols = rows[0].length;

    // Generate C array format
    const cArrayFormat = `const uint${
      numCols <= 8 ? '8' : numCols <= 16 ? '16' : '32'
    }_t PROGMEM matrix[${numRows}] = {\n${rows
      .map((row) => {
        // Convert to binary with 0b prefix
        let binValue = '0b';
        for (let i = 0; i < row.length; i++) {
          binValue += row[i] === matrixChars.dark ? '1' : '0';
        }
        return '  ' + binValue;
      })
      .join(',\n')}\n};`;

    // Generate Python list format
    const pythonFormat = `matrix = [\n${rows
      .map((row) => {
        // Convert to binary string with 0b prefix
        let binValue = '0b';
        for (let i = 0; i < row.length; i++) {
          binValue += row[i] === matrixChars.dark ? '1' : '0';
        }
        return '  ' + binValue;
      })
      .join(',\n')}\n]`;

    // Generate Arduino .h format
    const arduinoFormat = `#ifndef MATRIX_H\n#define MATRIX_H\n\n#include <Arduino.h>\n\n#define MATRIX_ROWS ${numRows}\n#define MATRIX_COLS ${numCols}\n\nconst uint${
      numCols <= 8 ? '8' : numCols <= 16 ? '16' : '32'
    }_t PROGMEM matrix[MATRIX_ROWS] = {\n${rows
      .map((row) => {
        // Convert to binary with 0b prefix
        let binValue = '0b';
        for (let i = 0; i < row.length; i++) {
          binValue += row[i] === matrixChars.dark ? '1' : '0';
        }
        return '  ' + binValue;
      })
      .join(',\n')}\n};\n\n#endif // MATRIX_H`;

    return { cArrayFormat, pythonFormat, arduinoFormat };
  };

  // Function to download LED matrix as a text file
  const downloadLEDMatrix = (format = 'text') => {
    if (!ledMatrix) return;

    let content = ledMatrix;
    let filename = 'led_matrix.txt';
    let type = 'text/plain';

    const formats = generateMatrixFormats();

    if (format === 'c' && formats) {
      content = formats.cArrayFormat;
      filename = 'matrix.c';
    } else if (format === 'python' && formats) {
      content = formats.pythonFormat;
      filename = 'matrix.py';
    } else if (format === 'arduino' && formats) {
      content = formats.arduinoFormat;
      filename = 'matrix.h';
    }

    // Create a blob with the LED matrix text
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Update canvas when text or font properties change
  useEffect(() => {
    drawTextOnCanvas();
  }, [text, fontSize, fontWeight, fontFamily, textColor, backgroundColor]);

  // Load initial Google fonts
  useEffect(() => {
    const loadInitialFonts = async () => {
      // Load Roboto and Open Sans as initial fonts
      await Promise.all([
        loadGoogleFont('Roboto'),
        loadGoogleFont('Open Sans'),
      ]);
    };

    loadInitialFonts();
  }, []);

  return (
    <div className="flex flex-col p-6 gap-6 xl mx-auto bg-gray-50 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center">
        Enhanced Text to LED Matrix Converter
      </h1>

      <div className='flex flex-col'>

      <div className="flex flex-col gap-2">
        <label className="font-medium">Enter Text:</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="border border-gray-300 rounded p-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Font Size:</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="8"
              max="100"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="flex-grow"
            />
            <span className="w-8 text-center">{fontSize}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Font Weight:</label>
          <select
            value={fontWeight}
            onChange={(e) => setFontWeight(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Lighter</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Font Family:</label>
          <select
            value={fontFamily}
            onChange={handleFontChange}
            className="border border-gray-300 rounded p-2"
          >
            <optgroup label="System Fonts">
              {availableFonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </optgroup>
            <optgroup label="Google Fonts">
              {googleFonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Text Color:</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Background Color:</label>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      <div className="bg-white p-4 border border-gray-300 rounded mt-4">
        <h2 className="text-lg font-medium mb-2">Canvas Preview:</h2>
        <div className="flex flex-col items-center bg-gray-100 p-4 rounded overflow-auto">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 mb-4"
            style={{ fontFamily }}
          ></canvas>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={downloadCanvas}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Download as PNG
            </button>

            <button
              onClick={convertToLEDMatrix}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Convert to LED Matrix
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* LED Matrix Configuration */}
      <div className="bg-white p-4 border border-gray-300 rounded mt-2">
        <h2 className="text-lg font-medium mb-2">LED Matrix Settings:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-medium">LED Rows:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="8"
                max="32"
                value={ledRows}
                onChange={(e) => setLedRows(parseInt(e.target.value))}
                className="flex-grow"
              />
              <span className="w-8 text-center">{ledRows}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-medium">Brightness Threshold:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="200"
                value={brightnessThreshold}
                onChange={(e) =>
                  setBrightnessThreshold(parseInt(e.target.value))
                }
                className="flex-grow"
              />
              <span className="w-8 text-center">{brightnessThreshold}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <label className="font-medium">Dark Character:</label>
            <input
              type="text"
              value={matrixChars.dark}
              maxLength="1"
              onChange={(e) =>
                setMatrixChars({ ...matrixChars, dark: e.target.value || '#' })
              }
              className="border border-gray-300 rounded p-1 w-12 text-center"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium">Light Character:</label>
            <input
              type="text"
              value={matrixChars.light}
              maxLength="1"
              onChange={(e) =>
                setMatrixChars({ ...matrixChars, light: e.target.value || '.' })
              }
              className="border border-gray-300 rounded p-1 w-12 text-center"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="contrast-enhanced"
              checked={contrastEnhanced}
              onChange={(e) => setContrastEnhanced(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="contrast-enhanced" className="font-medium">
              Enhance Contrast
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="invert-colors"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="invert-colors" className="font-medium">
              Invert Colors
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-preview"
              checked={matrixPreview}
              onChange={(e) => setMatrixPreview(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="show-preview" className="font-medium">
              Show LED Preview
            </label>
          </div>
        </div>
      </div>

      {/* LED Matrix Output */}
      {ledMatrix && (
        <div className="bg-white p-4 border border-gray-300 rounded mt-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium">
              LED Matrix Output:{' '}
              <span className="text-sm font-normal">
                {ledRows}x{ledColumns}
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => downloadLEDMatrix('text')}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
              >
                TXT
              </button>
              <button
                onClick={() => downloadLEDMatrix('c')}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
              >
                C
              </button>
              <button
                onClick={() => downloadLEDMatrix('python')}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
              >
                PY
              </button>
              <button
                onClick={() => downloadLEDMatrix('arduino')}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
              >
                H
              </button>
            </div>
          </div>

          {matrixPreview && (
            <div className="mb-4 flex justify-center">
              <canvas
                ref={previewCanvasRef}
                className="border border-gray-300"
              ></canvas>
            </div>
          )}

          <pre className="bg-gray-900 text-amber-400 p-2 rounded overflow-auto font-mono text-sm whitespace-pre">
            {ledMatrix}
          </pre>
        </div>
      )}

      <div className="text-sm text-gray-500">
        Note: The LED matrix conversion is optimized for monochrome LED displays
        and microcontrollers.
      </div>
    </div>
  );
}
