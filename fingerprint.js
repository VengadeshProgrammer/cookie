function getFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.error('WebGL not supported');
        return null;
    }
    
    canvas.width = 256;
    canvas.height = 256;
    
    // Shader code remains the same...
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
        
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        
        float gpuTest1(vec2 uv) {
            float a = sin(uv.x * 137.0) * cos(uv.y * 173.0);
            float b = tan(uv.x * 53.0) * atan(uv.y * 67.0);
            return (a * b + sin(a * b * 3.0)) * 0.5 + 0.5;
        }
        
        float gpuTest2(vec2 uv) {
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
            
            float r = gpuTest1(uv * 2.0 - 1.0);
            float g = gpuTest2(centered * 1.7 - 0.3);
            float b = gpuTest3(vec2(uv.y, uv.x) * 1.3 + 0.2);
            
            float hardwareNoise = hash(uv.x * 1000.0 + uv.y * 1000.0) * 0.1;
            float driverPattern = sin(uv.x * 300.0) * cos(uv.y * 250.0) * 0.05;
            
            vec3 color = vec3(
                r + hardwareNoise + driverPattern,
                g + hardwareNoise * 0.7 + driverPattern,
                b + hardwareNoise * 0.3 + driverPattern
            );
            
            color = clamp(color, 0.0, 1.0);
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fs);
    
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
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,
        -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5
    ]), gl.STATIC_DRAW);
    
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    
    const resolution = gl.getUniformLocation(program, 'resolution');
    gl.uniform2f(resolution, canvas.width, canvas.height);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    const timeUniform = gl.getUniformLocation(program, 'time');
    if (timeUniform) {
        gl.uniform1f(timeUniform, Date.now() * 0.001);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 4, 4);
    
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    const hardwareFingerprint = enhancedHardwareDownsample(pixels, canvas.width, canvas.height);
    
    // ADDED: Download functionality
    downloadFingerprint(hardwareFingerprint);
    
    return hardwareFingerprint;
}

// ADDED: Download function
function downloadFingerprint(fingerprint) {
    // Create a blob with the fingerprint data
    const data = {
        fingerprint: fingerprint,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
    });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webgl-fingerprint-${Date.now()}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    console.log('✅ Fingerprint downloaded!');
    console.log('🎯 Enhanced Hardware Fingerprint:');
    console.log('Length:', fingerprint.length);
    console.log('First 30 values:', fingerprint.slice(0, 30));
}

// The rest of your helper functions remain the same...
function enhancedHardwareDownsample(pixels, width, height) {
    const downsampled = [];
    
    const strategicPositions = [
        [0, 0, 50, 50],
        [width-50, 0, 50, 50],  
        [0, height-50, 50, 50],
        [width-50, height-50, 50, 50],
        [width/2-25, height/2-25, 50, 50],
        [width/4-25, height/4-25, 50, 50],
        [3*width/4-25, 3*height/4-25, 50, 50],
        [0, height/2-25, 50, 50],
        [width-50, height/2-25, 50, 50],
        [width/2-25, 0, 50, 50],
        [width/2-25, height-50, 50, 50]
    ];
    
    strategicPositions.forEach(([x, y, w, h]) => {
        const regionData = sampleRegion(pixels, width, height, x, y, w, h);
        downsampled.push(...regionData);
    });
    
    const gradientFeatures = analyzeGradients(pixels, width, height);
    downsampled.push(...gradientFeatures);
    
    const varianceFeatures = calculatePatternVariance(pixels, width, height);
    downsampled.push(...varianceFeatures);
    
    const colorFeatures = analyzeColorDistribution(pixels);
    downsampled.push(...colorFeatures);
    
    return downsampled;
}

function sampleRegion(pixels, width, height, startX, startY, regionWidth, regionHeight) {
    const regionData = [];
    const blockSize = 5;
    
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
    
    for (let y = 10; y < height - 10; y += 20) {
        for (let x = 10; x < width - 10; x += 20) {
            const idx = (y * width + x) * 4;
            
            const rightIdx = (y * width + (x + 5)) * 4;
            const hGradient = Math.abs(pixels[idx] - pixels[rightIdx]) +
                             Math.abs(pixels[idx+1] - pixels[rightIdx+1]) +
                             Math.abs(pixels[idx+2] - pixels[rightIdx+2]);
            
            const downIdx = ((y + 5) * width + x) * 4;
            const vGradient = Math.abs(pixels[idx] - pixels[downIdx]) +
                             Math.abs(pixels[idx+1] - pixels[downIdx+1]) +
                             Math.abs(pixels[idx+2] - pixels[downIdx+2]);
            
            gradients.push(hGradient / 3, vGradient / 3);
        }
    }
    
    return gradients.slice(0, 20);
}

function calculatePatternVariance(pixels, width, height) {
    const variances = [];
    const sampleSize = 1000;
    
    const samples = [];
    for (let i = 0; i < sampleSize; i++) {
        const x = Math.floor(Math.random() * (width - 1));
        const y = Math.floor(Math.random() * (height - 1));
        const idx = (y * width + x) * 4;
        samples.push((pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3);
    }
    
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    
    variances.push(mean, Math.sqrt(variance));
    return variances;
}

function analyzeColorDistribution(pixels) {
    const colorFeatures = [];
    const channels = { r: [], g: [], b: [] };
    const sampleCount = 500;
    
    for (let i = 0; i < sampleCount; i++) {
        const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4;
        channels.r.push(pixels[idx]);
        channels.g.push(pixels[idx + 1]);
        channels.b.push(pixels[idx + 2]);
    }
    
    ['r', 'g', 'b'].forEach(channel => {
        const data = channels[channel];
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const sorted = [...data].sort((a, b) => a - b);
        
        colorFeatures.push(
            mean,
            sorted[0],
            sorted[Math.floor(sorted.length * 0.25)],
            sorted[Math.floor(sorted.length * 0.5)],
            sorted[Math.floor(sorted.length * 0.75)],
            sorted[sorted.length - 1]
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

console.log('=== WebGL Fingerprint Generator Ready ==='); 
console.log('Click the button to generate and download your fingerprint');
