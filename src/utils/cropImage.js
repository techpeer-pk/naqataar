/**
 * Renders a react-easy-crop crop area (+ rotation) onto a canvas and returns
 * the result as a JPEG Blob. Standard recipe — react-easy-crop only reports
 * crop coordinates, it never touches pixels itself.
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

export async function getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation = 0, mimeType = 'image/jpeg') {
  const image = await loadImage(imageSrc);
  const radians = (rotation * Math.PI) / 180;

  // Oversized working canvas so a rotated image never clips at the edges,
  // then we cut the final square out of its center.
  const rotatedW = Math.abs(image.width * Math.cos(radians)) + Math.abs(image.height * Math.sin(radians));
  const rotatedH = Math.abs(image.width * Math.sin(radians)) + Math.abs(image.height * Math.cos(radians));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = rotatedW;
  workCanvas.height = rotatedH;
  const workCtx = workCanvas.getContext('2d');
  workCtx.translate(rotatedW / 2, rotatedH / 2);
  workCtx.rotate(radians);
  workCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = croppedAreaPixels.width;
  outCanvas.height = croppedAreaPixels.height;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(
    workCanvas,
    croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0, croppedAreaPixels.width, croppedAreaPixels.height,
  );

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas is empty')), mimeType, 0.9);
  });
}
