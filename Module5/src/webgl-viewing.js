import * as glMatrix from 'gl-matrix';
const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

// This is the main function to initialize WebGL, set up shaders, buffers, sliders, and rendering
function main() {
    const canvas = document.getElementById("glCanvas");

    const gl = initWebGL(canvas);
    if (!gl) {
        console.error("Sorry, it doesn't seem like WebGL is currently available on your system. Please install it and try again.");
        return;
    }

    // This is initializing shaders, buffers, and attributes for rendering
    const shaderProgram = initShaders(gl);
    const { vertexBuffer, colorBuffer, indexBuffer } = initBuffers(gl);

    const position = gl.getAttribLocation(shaderProgram, "position");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    const color = gl.getAttribLocation(shaderProgram, "color");
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(color);

    // Finding uniform variables for model-view and projection matrices in the shaders
    const modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");

    // Initializing camera and transformation variables
    const at = vec3.fromValues(0.0, 0.0, 0.0);
    const up = vec3.fromValues(0.0, 1.0, 0.0);
    let radius = 2.0;
    let theta = 1.0;
    let phi = 1.0;
    let near = 1.0;
    let far = 5.0;

    // These sliders will allow interactive control over the cube's transformation and viewing parameters
    document.getElementById("distanceSlider").oninput = (e) => (radius = parseFloat(e.target.value));
    document.getElementById("horizontalRotationSlider").oninput = (e) => (theta = parseFloat(e.target.value));
    document.getElementById("verticalRotationSlider").oninput = (e) => (phi = parseFloat(e.target.value));
    document.getElementById("viewDepthSlider").oninput = (e) => {
        const depth = parseFloat(e.target.value);
        near = -depth;
        far = depth;
    };    

    // Rendering function to update the scene dynamically based on slider values
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // This variable is calculating the eye position based on radius, theta, and phi
        const eye = vec3.fromValues(
            radius * Math.sin(theta) * Math.cos(phi),
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(theta)
        );

        const modelViewMatrix = mat4.lookAt(mat4.create(), eye, at, up);
        const projectionMatrix = mat4.ortho(mat4.create(), -1.5, 1.5, -1.5, 1.5, near, far);

        gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
        gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST); // Enabling depth testing for accurate 3D rendering
    gl.clearColor(0.1, 0.1, 0.1, 1.0); // Seting the background color to a super dark gray to make pink stand out
    render(); // Starting the loop
}

// This function initializes the WebGL context from the canvas element
function initWebGL(canvas) {
    return canvas.getContext("webgl");
}

// This function initializes shaders by compiling and linking vertex and fragment shader code
function initShaders(gl) {
    const vertShaderCode = `
        attribute vec3 position;
        attribute vec3 color;
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        varying vec3 vColor;

        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
            vColor = color;
        }
    `;

    const fragShaderCode = `
        precision mediump float;
        varying vec3 vColor;

        void main(void) {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertShaderCode);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragShaderCode);
    gl.compileShader(fragShader);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    gl.useProgram(shaderProgram);
    return shaderProgram;
}

// This function initializes buffers for the cube's vertices, colors, and indices
function initBuffers(gl) {
    const vertices = [
        -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
        -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
        -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
        -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
         1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
        -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
    ];

    const colors = [
        1.0, 0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5, 0.5,
        0.9, 0.4, 0.4, 0.9, 0.4, 0.4, 0.9, 0.4, 0.4, 0.9, 0.4, 0.4,
        0.8, 0.3, 0.5, 0.8, 0.3, 0.5, 0.8, 0.3, 0.5, 0.8, 0.3, 0.5,
        0.7, 0.5, 0.6, 0.7, 0.5, 0.6, 0.7, 0.5, 0.6, 0.7, 0.5, 0.6,
        0.9, 0.5, 0.7, 0.9, 0.5, 0.7, 0.9, 0.5, 0.7, 0.9, 0.5, 0.7,
        1.0, 0.6, 0.8, 1.0, 0.6, 0.8, 1.0, 0.6, 0.8, 1.0, 0.6, 0.8
    ];

    const indices = [
         0,  1,  2,   0,  2,  3,
         4,  5,  6,   4,  6,  7,
         8,  9, 10,   8, 10, 11,
        12, 13, 14,  12, 14, 15,
        16, 17, 18,  16, 18, 19,
        20, 21, 22,  20, 22, 23
    ];

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return { vertexBuffer, colorBuffer, indexBuffer };
}

// Main function being called upon page load
main();