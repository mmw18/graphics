(function initialize() {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
        console.error("Sorry, it doesn't seem like WebGL is currently available on your system. Please install it and try again.");
        return;
    }

    // This is where the geometry of the cube is actually defined
    const vertices = [
        -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
        -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,
        -1,  1, -1, -1,  1,  1,  1,  1,  1,  1,  1, -1,
        -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1,
         1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,
        -1, -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1
    ];

    const colors = [
        // Making each side of the cube be a  cute shade of pink!
        1.0, 0.5, 0.5,  1.0, 0.5, 0.5,  1.0, 0.5, 0.5,  1.0, 0.5, 0.5, // front
        0.9, 0.4, 0.4,  0.9, 0.4, 0.4,  0.9, 0.4, 0.4,  0.9, 0.4, 0.4, // behind
        0.8, 0.3, 0.5,  0.8, 0.3, 0.5,  0.8, 0.3, 0.5,  0.8, 0.3, 0.5, // top
        0.7, 0.5, 0.6,  0.7, 0.5, 0.6,  0.7, 0.5, 0.6,  0.7, 0.5, 0.6, // bottom
        0.9, 0.5, 0.7,  0.9, 0.5, 0.7,  0.9, 0.5, 0.7,  0.9, 0.5, 0.7, // right
        1.0, 0.6, 0.8,  1.0, 0.6, 0.8,  1.0, 0.6, 0.8,  1.0, 0.6, 0.8  // left
    ];

    const indices = [
        0, 1, 2,  0, 2, 3,   // front
        4, 5, 6,  4, 6, 7,   // behind
        8, 9, 10,  8, 10, 11, // top
        12, 13, 14,  12, 14, 15, // bottom
        16, 17, 18,  16, 18, 19, // right
        20, 21, 22,  20, 22, 23  // left
    ];

    // These are the buffers for the cube's vertex positions, coloring, & indices. 
    // They help to render the cube by storing data on the GPU.
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // This bit of the program is defining and compiling the vertex and fragment shaders> then links them into program
    // Vertex shader is going to be processing the position and color data, whilst the fragment shader is going to be 
    //  deciding the final color for each pixel.
    const vertCode = `
        attribute vec3 position;
        uniform mat4 Pmatrix;
        uniform mat4 Vmatrix;
        uniform mat4 Mmatrix;
        attribute vec3 color;
        varying vec3 vColor;

        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
            vColor = color;
        }
    `;

    const fragCode = `
        precision mediump float;
        varying vec3 vColor;

        void main(void) {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    gl.useProgram(shaderProgram);

    // This is where the vertex position and color buffers are linked to the shader attributes. 
    // It is also retrieving the uniform locations for transformation matrices, which will enable the 3D effect
    const position = gl.getAttribLocation(shaderProgram, "position");
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    const color = gl.getAttribLocation(shaderProgram, "color");
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(color);

    const Pmatrix = gl.getUniformLocation(shaderProgram, "Pmatrix");
    const Vmatrix = gl.getUniformLocation(shaderProgram, "Vmatrix");
    const Mmatrix = gl.getUniformLocation(shaderProgram, "Mmatrix");

    // This is creating out all the matrices for the cube so it can spin
    const projMatrix = getProjection(40, canvas.width / canvas.height, 1, 100);
    const viewMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -6, 1];
    const movMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    function getProjection(angle, aspect, zMin, zMax) {
        const tanHalfFOV = Math.tan((angle * Math.PI) / 360);
        return [
            1 / (aspect * tanHalfFOV), 0, 0, 0,
            0, 1 / tanHalfFOV, 0, 0,
            0, 0, -(zMax + zMin) / (zMax - zMin), -1,
            0, 0, -(2 * zMax * zMin) / (zMax - zMin), 0,
        ];
    }

    function rotateX(matrix, angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const mv1 = matrix[1], mv5 = matrix[5], mv9 = matrix[9];

        matrix[1] = mv1 * cos - matrix[2] * sin;
        matrix[5] = mv5 * cos - matrix[6] * sin;
        matrix[9] = mv9 * cos - matrix[10] * sin;

        matrix[2] = mv1 * sin + matrix[2] * cos;
        matrix[6] = mv5 * sin + matrix[6] * cos;
        matrix[10] = mv9 * sin + matrix[10] * cos;
    }

    function rotateY(matrix, angle) {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const mv0 = matrix[0], mv4 = matrix[4], mv8 = matrix[8];

        matrix[0] = mv0 * cos + matrix[2] * sin;
        matrix[4] = mv4 * cos + matrix[6] * sin;
        matrix[8] = mv8 * cos + matrix[10] * sin;

        matrix[2] = mv0 * -sin + matrix[2] * cos;
        matrix[6] = mv4 * -sin + matrix[6] * cos;
        matrix[10] = mv8 * -sin + matrix[10] * cos;
    }

    // Making the cube spin around!
    let oldTime = 0;
    function animate(time) {
        const dt = time - oldTime;
        oldTime = time;

        rotateX(movMatrix, dt * 0.002);
        rotateY(movMatrix, dt * 0.002);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(Pmatrix, false, projMatrix);
        gl.uniformMatrix4fv(Vmatrix, false, viewMatrix);
        gl.uniformMatrix4fv(Mmatrix, false, movMatrix);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(animate);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);

    animate(0);
})();
