function getFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.error('WebGL not supported');
        return null;
    }
    
    canvas.width = 256; // Increased resolution
    canvas.height = 256;
    
    // Enhanced shader with MORE hardware-specific operations
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, `
        attribute vec2 position;
        varying vec2 vPosition;
        void main() {
            vPosition = position;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, `
        precision highp float;
        uniform vec2 resolution;
        uniform float time;
        varying vec2 vPosition;
        
        // GPU architecture stress tests
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        
        float gpuTest1(vec2 uv) {
            // Test floating-point precision differences
            float a = sin(uv.x * 137.0) * cos(uv.y * 173.0);
            float b = tan(uv.x * 53.0) * atan(uv.y * 67.0);
            return (a * b + sin(a * b * 3.0)) * 0.5 + 0.5;
        }
        
        float gpuTest2(vec2 uv) {
            // Test trigonometric function precision
            float r = 0.0;
            for (int i = 0; i < 4; i++) {
                float fi = float(i);
                r += sin(uv.x * (20.0 + fi * 5.0)) * 
                      cos(uv.y * (15.0 + fi * 3.0)) * 
                      tan((uv.x + uv.y) * (8.0 + fi));
            }
            return r * 0.25 + 0.5;
        }
        
        float gpuTest3(vec2 uv) {
            // Test exponential/logarithmic precision
            float r = 0.0;
            for (int i = 0; i < 3; i++) {
                float fi = float(i);
                r += pow(uv.x * (1.5 + fi * 0.3), uv.y * (2.0 + fi * 0.5)) *
                      log(uv.x * uv.y * (3.0 + fi) + 1.0);
            }
            return r * 0.1 + 0.5;
        }
        
        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec2 centered = (vPosition + 1.0) * 0.5;
            
            // Multiple GPU stress tests running simultaneously
            float r = gpuTest1(uv * 2.0 - 1.0);
            float g = gpuTest2(centered * 1.7 - 0.3);
            float b = gpuTest3(vec2(uv.y, uv.x) * 1.3 + 0.2);
            
            // Hardware-specific noise based on position
            float hardwareNoise = hash(uv.x * 1000.0 + uv.y * 1000.0) * 0.1;
            
            // Driver-specific patterns
            float driverPattern = sin(uv.x * 300.0) * cos(uv.y * 250.0) * 0.05;
            
            vec3 color = vec3(
                r + hardwareNoise + driverPattern,
                g + hardwareNoise * 0.7 + driverPattern,
                b + hardwareNoise * 0.3 + driverPattern
            );
            
            // Clamp to valid range
            color = clamp(color, 0.0, 1.0);
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fs);
    
    // Check for shader compilation errors
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
    }
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
    }
    
    gl.useProgram(program);
    
    // Set up geometry with more vertices for better GPU stress
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0, // Main quad
        -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5  // Inner quad for more complexity
    ]), gl.STATIC_DRAW);
    
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    
    const resolution = gl.getUniformLocation(program, 'resolution');
    gl.uniform2f(resolution, canvas.width, canvas.height);
    
    // Multiple rendering passes for better hardware stress
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // First pass - full quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Second pass - inner quad with different parameters
    const timeUniform = gl.getUniformLocation(program, 'time');
    if (timeUniform) {
        gl.uniform1f(timeUniform, Date.now() * 0.001);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 4, 4);
    
    // Read pixels
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // ENHANCED downsampling that preserves hardware patterns
    const hardwareFingerprint = enhancedHardwareDownsample(pixels, canvas.width, canvas.height);
    
    console.log('🎯 Enhanced Hardware Fingerprint:');
    console.log('Length:', hardwareFingerprint.length);
    console.log('First 30 values:', hardwareFingerprint.slice(0, 30));
    
    return hardwareFingerprint;
}

function enhancedHardwareDownsample(pixels, width, height) {
    const downsampled = [];
    
    // Strategy 1: Strategic sampling of GPU-sensitive regions
    const strategicPositions = [
        // Corners (often show driver differences)
        [0, 0, 50, 50],           // Top-left
        [width-50, 0, 50, 50],    // Top-right  
        [0, height-50, 50, 50],   // Bottom-left
        [width-50, height-50, 50, 50], // Bottom-right
        
        // Center regions (GPU computation focus)
        [width/2-25, height/2-25, 50, 50],
        [width/4-25, height/4-25, 50, 50],
        [3*width/4-25, 3*height/4-25, 50, 50],
        
        // Edge patterns (texture filtering differences)
        [0, height/2-25, 50, 50],     // Left edge
        [width-50, height/2-25, 50, 50], // Right edge
        [width/2-25, 0, 50, 50],      // Top edge
        [width/2-25, height-50, 50, 50] // Bottom edge
    ];
    
    // Sample strategic regions
    strategicPositions.forEach(([x, y, w, h]) => {
        const regionData = sampleRegion(pixels, width, height, x, y, w, h);
        downsampled.push(...regionData);
    });
    
    // Strategy 2: Gradient analysis for GPU precision
    const gradientFeatures = analyzeGradients(pixels, width, height);
    downsampled.push(...gradientFeatures);
    
    // Strategy 3: Pattern variance (hardware consistency)
    const varianceFeatures = calculatePatternVariance(pixels, width, height);
    downsampled.push(...varianceFeatures);
    
    // Strategy 4: Color distribution (GPU color precision)
    const colorFeatures = analyzeColorDistribution(pixels);
    downsampled.push(...colorFeatures);
    
    console.log('🔧 Enhanced fingerprint components:');
    console.log('   Strategic regions:', strategicPositions.length * 75); // 25px² × 3 channels
    console.log('   Gradient features:', gradientFeatures.length);
    console.log('   Variance features:', varianceFeatures.length);
    console.log('   Color features:', colorFeatures.length);
    console.log('   Total length:', downsampled.length);
    
    return downsampled;
}

function sampleRegion(pixels, width, height, startX, startY, regionWidth, regionHeight) {
    const regionData = [];
    const blockSize = 5; // Smaller blocks for more detail
    
    for (let y = startY; y < startY + regionHeight && y < height; y += blockSize) {
        for (let x = startX; x < startX + regionWidth && x < width; x += blockSize) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
                for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    r += pixels[idx];
                    g += pixels[idx + 1];
                    b += pixels[idx + 2];
                    count++;
                }
            }
            
            if (count > 0) {
                regionData.push(
                    Math.round(r / count),
                    Math.round(g / count), 
                    Math.round(b / count)
                );
            }
        }
    }
    
    return regionData;
}

function analyzeGradients(pixels, width, height) {
    const gradients = [];
    
    // Analyze horizontal and vertical gradients
    for (let y = 10; y < height - 10; y += 20) {
        for (let x = 10; x < width - 10; x += 20) {
            const idx = (y * width + x) * 4;
            
            // Horizontal gradient
            const rightIdx = (y * width + (x + 5)) * 4;
            const hGradient = Math.abs(pixels[idx] - pixels[rightIdx]) +
                             Math.abs(pixels[idx+1] - pixels[rightIdx+1]) +
                             Math.abs(pixels[idx+2] - pixels[rightIdx+2]);
            
            // Vertical gradient  
            const downIdx = ((y + 5) * width + x) * 4;
            const vGradient = Math.abs(pixels[idx] - pixels[downIdx]) +
                             Math.abs(pixels[idx+1] - pixels[downIdx+1]) +
                             Math.abs(pixels[idx+2] - pixels[downIdx+2]);
            
            gradients.push(hGradient / 3, vGradient / 3);
        }
    }
    
    return gradients.slice(0, 20); // Limit to top 20 gradient features
}

function calculatePatternVariance(pixels, width, height) {
    const variances = [];
    const sampleSize = 1000;
    
    // Sample random pixels to calculate variance
    const samples = [];
    for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor(Math.random() * (width - 1));
        const y = Math.floor(Math.random() * (height - 1));
        const idx = (y * width + x) * 4;
        samples.push((pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3);
    }
    
    // Calculate variance
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    
    variances.push(mean, Math.sqrt(variance));
    return variances;
}

function analyzeColorDistribution(pixels) {
    const colorFeatures = [];
    const channels = { r: [], g: [], b: [] };
    const sampleCount = 500;
    
    // Sample color distribution
    for (let i = 0; i < sampleCount; i++) {
        const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4;
        channels.r.push(pixels[idx]);
        channels.g.push(pixels[idx + 1]);
        channels.b.push(pixels[idx + 2]);
    }
    
    // Calculate channel statistics
    ['r', 'g', 'b'].forEach(channel => {
        const data = channels[channel];
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const sorted = [...data].sort((a, b) => a - b);
        
        colorFeatures.push(
            mean,
            sorted[0], // min
            sorted[Math.floor(sorted.length * 0.25)], // q1
            sorted[Math.floor(sorted.length * 0.5)], // median
            sorted[Math.floor(sorted.length * 0.75)], // q3
            sorted[sorted.length - 1] // max
        );
    });
    
    return colorFeatures;
}
// Create button 
const button = document.createElement('button'); 
button.textContent = 'Download WebGL Fingerprint'; 
button.style.padding = '10px 20px'; 
button.style.margin = '20px'; 
button.style.fontSize = '16px'; 
button.style.cursor = 'pointer';
button.onclick = getFingerprint; 
document.body.appendChild(button);
// Auto-run
console.log('=== Generating WebGL Fingerprint ==='); 
getFingerprint();
