function saveOptimizedWebGLFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
        return null;
    }
    
    canvas.width = 128;
    canvas.height = 128;
    
    // Vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vs);
    
    // Fragment shader with GPU-stressing math
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, `
        precision highp float;
        uniform vec2 resolution;
        void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            
            // GPU-intensive calculations that vary by hardware
            float r = sin(uv.x * 25.0) * cos(uv.y * 18.0) * tan(uv.x * 8.0);
            float g = cos(uv.x * 15.0 + uv.y * 12.0) * sin(uv.y * 7.0);
            float b = sin((uv.x * 0.7 + uv.y * 1.3) * 30.0) * cos(uv.x * 6.0 + uv.y * 4.0);
            
            // Add noise patterns that stress floating-point precision
            float noise = sin(uv.x * 100.0) * cos(uv.y * 80.0) * 0.1;
            
            vec3 color = vec3(r + noise, g + noise * 0.7, b + noise * 0.3) * 0.5 + 0.5;
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fs);
    
    // Create and link program
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    
    // Set up geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
    ]), gl.STATIC_DRAW);
    
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    
    // Set resolution uniform
    const resolution = gl.getUniformLocation(program, 'resolution');
    gl.uniform2f(resolution, canvas.width, canvas.height);
    
    // Render
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Read ALL pixels
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // Smart downsampling that preserves uniqueness
    const downsampledFingerprint = smartDownsample(pixels, canvas.width, canvas.height);
    
    console.log('Downsampled WebGL Fingerprint:');
    console.log('Length:', downsampledFingerprint.length);
    console.log('First 20 values:', downsampledFingerprint.slice(0, 20));
    
    // Save ONLY the downsampledFingerprint array
    const jsonString = JSON.stringify(downsampledFingerprint);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `webgl-fingerprint-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Downloaded downsampled fingerprint!');
    return downsampledFingerprint;
}

function smartDownsample(pixels, width, height) {
    const downsampled = [];
    
    // Sample every 8th pixel from all RGB channels
    for (let i = 0; i < pixels.length; i += 32) {
        downsampled.push(pixels[i]);       // R
        downsampled.push(pixels[i + 1]);   // G  
        downsampled.push(pixels[i + 2]);   // B
    }
    
    return downsampled;
}

// Create button
const button = document.createElement('button');
button.textContent = 'Download WebGL Fingerprint';
button.style.padding = '10px 20px';
button.style.margin = '20px';
button.style.fontSize = '16px';
button.style.cursor = 'pointer';
button.onclick = saveOptimizedWebGLFingerprint;
document.body.appendChild(button);

// Auto-run
console.log('=== Generating WebGL Fingerprint ===');
saveOptimizedWebGLFingerprint();
