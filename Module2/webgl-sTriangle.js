// This is the entry point for the program
(function initialize() {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl");

    // Making sure WebGL is available in the system trying to use it
    //    If not provide an error message
    if (!gl) {
        console.error("Sorry, it doesn't seem like WebGL is currently available on your system. Please install it and try again.");
        return;
    }

    // This is configuring the viewport of WebGL and setting the background color to a light blue
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.82, 0.93, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Vertex shader source for setting the vertex positions
    const vertexShaderSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    // Fragment shader source for the triangle, in the color pink
    const fragmentShaderSource = `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(1.0, 0.75, 0.8, 1.0);
        }
    `;

    // This will compile our shaders and link into a program (function below)
    const shaderProgram = setupShaders(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(shaderProgram);

    // This is the location variable for the vertex position to use
    const positionLocation = gl.getAttribLocation(shaderProgram, "position");

    // This is the definition of triangle vertices for the sierpinski gasket (starting with the big triangle)
    const initialVertices = [
        -0.5, -0.5, // bottom-left
         0.5, -0.5, // bottom-right
         0.0,  0.5  // top point
    ];

    const points = []; // This is initialization of the array that will hold veriticies for the gasket
    let currentDepth = 0; // starting at 0...
    const maxDepth = 5; //   and going to a max of 5

    // This function is for animating the rendering of the gasket so the user can watch it from start to finish
    function animateGasket() {
        points.length = 0; // Clear points array for each frame
        sierpinskiT(initialVertices, currentDepth, points);

        // Here is where the buffer data is created and sent
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

        // This is linking the buffer to the shader
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLocation);

        // This clears and re-draws the current frame
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, points.length / 2);

        // Graduly increasing the depth
        if (currentDepth < maxDepth) {
            currentDepth++;
            setTimeout(animateGasket, 500);
        }
    }

    // Animation go!
    animateGasket();

    // This array will hold all vertices for the Gasket
    sierpinskiT(initialVertices, 5, points); // make triangles w depth of 5

    // This is where we create our buffer (designated area of storing data)
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // This is linking the buffer data to the position attribute made earlier in the vertex shader
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    // Drawing it out w gl triangles
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, points.length / 2);
})();

// This is a 'recursive' function that will generate the vertices for the gasket
function sierpinskiT(vertices, depth, points) {
    // (base case)
    if (depth === 0) {
        points.push(...vertices);
        return;
    }

    // This is the calculation for each triangle-side's midpoint
    const [x1, y1, x2, y2, x3, y3] = vertices;
    const mid1 = [(x1 + x2) / 2, (y1 + y2) / 2];
    const mid2 = [(x2 + x3) / 2, (y2 + y3) / 2];
    const mid3 = [(x1 + x3) / 2, (y1 + y3) / 2];

    // Subdividing into smaller triangles
    sierpinskiT([x1, y1, ...mid1, ...mid3], depth - 1, points);
    sierpinskiT([...mid1, x2, y2, ...mid2], depth - 1, points);
    sierpinskiT([...mid3, ...mid2, x3, y3], depth - 1, points);
}

// This is a helper function (used just above^) for compiling the shaders and linking the program
function setupShaders(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader program failed to link:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

// This is a helper function to assist with creating and compiling a shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Error check
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Sorry, there seems to have been an error compiling the shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
