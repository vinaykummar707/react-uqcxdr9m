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