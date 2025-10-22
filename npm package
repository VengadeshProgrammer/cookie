// COMPLETE CANVAS PROTECTION
(function() {
    'use strict';
    
    // Store all original canvas methods BEFORE anything else
    const canvasProtection = {
        getImageData: CanvasRenderingContext2D.prototype.getImageData,
        toBlob: HTMLCanvasElement.prototype.toBlob
    };
    
    // Lock down getImageData (main fingerprinting method)
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'getImageData', {
        value: canvasProtection.getImageData,
        writable: false,
        configurable: false
    });
    
    // Monitor for any tampering attempts
    let protectionAttempts = 0;
    const originalDefineProperty = Object.defineProperty;
    
    Object.defineProperty = function(obj, prop, descriptor) {
        if (obj === CanvasRenderingContext2D.prototype && prop === 'getImageData') {
            protectionAttempts++;
            return obj; // Block the redefinition
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
    };
})();

// DETECTION: Simple check after prevention
function detectCanvasTampering() {
    // Method 1: Check getImageData function identity
    function checkGetImageData() {
        const nativeGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        // Check if function has been wrapped/modified
        const functionString = nativeGetImageData.toString();
        const isNative = functionString.includes('[native code]') || 
                        functionString.trim().startsWith('function getImageData()');
        
        // Check for common wrapper patterns
        const hasApplyCall = functionString.includes('.apply(') || functionString.includes('.call(');
        const hasWrapperPatterns = functionString.includes('orig.apply') || 
                                 functionString.includes('original.apply') ||
                                 functionString.includes('return orig');
        
        return {
            passed: isNative && !hasWrapperPatterns,
            details: {
                isNative: isNative,
                hasWrapperPatterns: hasWrapperPatterns,
                functionString: functionString
            }
        };
    }

    const {passed} = checkGetImageData();
    return passed ? "not tampered" : "tampered";
}

function getCanvasFingerprint() {
  const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 200;
const ctx = canvas.getContext('2d');

// Draw something that depends on the user's system
ctx.textBaseline = 'top';
ctx.font = '14px Arial';
ctx.fillStyle = '#f60';
ctx.fillRect(100, 1, 62, 20);
ctx.fillStyle = '#069';
ctx.fillText('fingerprint-test', 2, 15);

// Extract raw RGBA pixel data
return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}
function downsamplePixels(data, step = 100) {
  const sampled = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i] / 255); // normalize 0–1
  }
  return sampled;
}

export async function getFingerprint() {
  if(detectCanvasTampering() === "tampered") {
    return "tampered";
  } else {
  const canvasFP = getCanvasFingerprint();
  const downsampledCanvasFP = downsamplePixels(canvasFP, 100);
  return {downsampledCanvasFP};
}
}
