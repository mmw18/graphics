import { mat4, vec3 } from "gl-matrix";

// This is the main function responsible for grabbing WebGl and rendering the sphere
function startWebGLApp() {
    const canvasElement = document.getElementById("glCanvas");
    const subdivisionControl = document.getElementById("subdivisionSlider");
    const glContext = initializeWebGLContext(canvasElement);

    if (!glContext) {
        console.error("Sorry, it doesn't seem like WebGL is currently available on your system. Please install it and try again.");
        return;
    }

    // These const are initializing the shaders and buffers
    const activeShaderProgram = setupShaders(glContext);
    const sphereBuffers = createSphereBuffers(glContext);

    // These const are the locations for attribute and variables
    const positionAttrib = glContext.getAttribLocation(activeShaderProgram, "position");
    const modelViewUniform = glContext.getUniformLocation(activeShaderProgram, "uModelViewMatrix");
    const projectionUniform = glContext.getUniformLocation(activeShaderProgram, "uProjectionMatrix");

    glContext.bindBuffer(glContext.ARRAY_BUFFER, sphereBuffers.vertexBuffer);
    glContext.vertexAttribPointer(positionAttrib, 3, glContext.FLOAT, false, 0, 0);
    glContext.enableVertexAttribArray(positionAttrib);

    // Thse are the camera settings
    const targetCenter = vec3.fromValues(0.0, 0.0, 0.0);
    const cameraUpVector = vec3.fromValues(0.0, 1.0, 0.0);
    let cameraRadius = 5.0;
    let cameraTheta = Math.PI / 6;
    let cameraPhi = Math.PI / 4;

    // This event function is updating the buffers anytime the user interacts with the slider bar
    subdivisionControl.oninput = (event) => {
        const recursionLevel = parseInt(event.target.value, 10);
        const updatedBuffers = createSphereBuffers(glContext, recursionLevel);

        glContext.bindBuffer(glContext.ARRAY_BUFFER, updatedBuffers.vertexBuffer);
        glContext.vertexAttribPointer(positionAttrib, 3, glContext.FLOAT, false, 0, 0);
        sphereBuffers.vertexBuffer = updatedBuffers.vertexBuffer;

        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, updatedBuffers.indexBuffer);
        sphereBuffers.indexBuffer = updatedBuffers.indexBuffer;
        sphereBuffers.indexCount = updatedBuffers.indexCount;

        console.log("Subdivision level updated:", recursionLevel);
    };

    // This function is rendering the sphere with WebGl
    function renderSphere() {
        glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

        const cameraPosition = vec3.fromValues(
            cameraRadius * Math.sin(cameraTheta) * Math.cos(cameraPhi),
            cameraRadius * Math.sin(cameraTheta) * Math.sin(cameraPhi),
            cameraRadius * Math.cos(cameraTheta)
        );

        const modelViewMatrix = mat4.lookAt(mat4.create(), cameraPosition, targetCenter, cameraUpVector);
        const projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 4, canvasElement.width / canvasElement.height, 0.1, 20.0);

        glContext.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);
        glContext.uniformMatrix4fv(projectionUniform, false, projectionMatrix);

        glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, sphereBuffers.indexBuffer);
        glContext.drawElements(glContext.TRIANGLES, sphereBuffers.indexCount, glContext.UNSIGNED_SHORT, 0);

        requestAnimationFrame(renderSphere);
    }

    glContext.enable(glContext.DEPTH_TEST);
    glContext.enable(glContext.CULL_FACE);
    glContext.cullFace(glContext.BACK);
    glContext.clearColor(0.1, 0.1, 0.1, 1.0);

    renderSphere();
}

// This function is initializing WebGl for use
function initializeWebGLContext(canvasElement) {
    return canvasElement.getContext("webgl") || canvasElement.getContext("experimental-webgl");
}

// These functions are setting up the shaders used in the rendering
function setupShaders(glContext) {
    const vertexShaderSource = `
attribute vec3 position;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
}
    `;

    const fragmentShaderSource = `
precision mediump float;

void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.5, 1.0); // Pink sphere
}
    `;

    const vertexShader = glContext.createShader(glContext.VERTEX_SHADER);
    glContext.shaderSource(vertexShader, vertexShaderSource);
    glContext.compileShader(vertexShader);

    const fragmentShader = glContext.createShader(glContext.FRAGMENT_SHADER);
    glContext.shaderSource(fragmentShader, fragmentShaderSource);
    glContext.compileShader(fragmentShader);

    const shaderProgram = glContext.createProgram();
    glContext.attachShader(shaderProgram, vertexShader);
    glContext.attachShader(shaderProgram, fragmentShader);
    glContext.linkProgram(shaderProgram);
    glContext.useProgram(shaderProgram);

    return shaderProgram;
}

// This function is making the sphere geometry buffers
function createSphereBuffers(glContext, recursionLevel = 3) {
    const vertices = [];
    const indices = [];

    const initialA = vec3.fromValues(0.0, 0.0, -1.0);
    const initialB = vec3.fromValues(0.0, 0.942809, 0.333333);
    const initialC = vec3.fromValues(-0.816497, -0.471405, 0.333333);
    const initialD = vec3.fromValues(0.816497, -0.471405, 0.333333);

    refineSphere(initialA, initialB, initialC, recursionLevel, vertices, indices);
    refineSphere(initialD, initialC, initialB, recursionLevel, vertices, indices);
    refineSphere(initialA, initialD, initialB, recursionLevel, vertices, indices);
    refineSphere(initialA, initialC, initialD, recursionLevel, vertices, indices);

    const vertexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertices), glContext.STATIC_DRAW);

    const indexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
    glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), glContext.STATIC_DRAW);

    return {
        vertexBuffer,
        indexBuffer,
        indexCount: indices.length,
    };
}

// This function is recursively refining the sphere geometry
function refineSphere(v1, v2, v3, depth, vertices, indices) {
    if (depth === 0) {
        const indexOffset = vertices.length / 3;
        vertices.push(...v1, ...v2, ...v3);
        indices.push(indexOffset, indexOffset + 1, indexOffset + 2);
        return;
    }

    const mid12 = vec3.create();
    vec3.add(mid12, v1, v2);
    vec3.normalize(mid12, mid12);

    const mid23 = vec3.create();
    vec3.add(mid23, v2, v3);
    vec3.normalize(mid23, mid23);

    const mid31 = vec3.create();
    vec3.add(mid31, v3, v1);
    vec3.normalize(mid31, mid31);

    refineSphere(v1, mid12, mid31, depth - 1, vertices, indices);
    refineSphere(v2, mid23, mid12, depth - 1, vertices, indices);
    refineSphere(v3, mid31, mid23, depth - 1, vertices, indices);
    refineSphere(mid12, mid23, mid31, depth - 1, vertices, indices);
}

startWebGLApp();
