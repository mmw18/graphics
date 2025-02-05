/** Program Overview
 * 
 *  This is a WebGl application that will render a sphere to the screen, built of many subdivided tetrahedrons. 
 * I made use of the gl-matrix library to take care of the matrix and vector math, and the sphere is being generated
 * by recursively refining a single tetrahedron into a more detailed shape. I used the Painter's algorithm to draw
 * the sphere, which will sort the triangles by depth to ensure accurate hidden-surface removal without havig to
 * rely on built in depth testing. Every triangle is given a different color on a gradient, where the triangles
 * father away are a different color than those closer. This not only helps with being able to actually see the
 * sorting process but is more visually appealing to the user. I have also added a slider to the screen that
 * allows the user to change the level of subdivision of the cube at anytime. 
 * 
 *  Through the process of building this program I used a combination of my web development background and the
 * new concepts we learned during this Graphics course. I set up shaders to handle the basic transformations
 * and coloring, and then manually sorted the triangles with every frame to simulate hidden-surface removal. 
 * I have the camera positioned using spherical coordinated which ensured I can generate view and projection
 * matrices on the fly. Overall, was a great challange in tying together coding with WebGl, adding interactivity, 
 * and being able to clearly demonstrate what is a classic technique in the world of computer science. 
 * 
 */

import { mat4, vec3, vec4 } from "gl-matrix";

// This is the main function that will start WebGL and then render the sphere using the Painter's algorithm
function startWebGLApp() {
    const canvasElement = document.getElementById("glCanvas");
    const subdivisionControl = document.getElementById("subdivisionSlider");
    const glContext = initializeWebGLContext(canvasElement);

    if (!glContext) {
        console.error("WebGL is not available on your system. Please install it and try again.");
        return;
    }

    // This is initializing the shaders and the createSphereBuffers method
    const activeShaderProgram = setupShaders(glContext);
    let sphereData = createSphereBuffers(glContext);

    // These are the locations for our attributes and uniforms in the shader
    const positionAttrib = glContext.getAttribLocation(activeShaderProgram, "position");
    const modelViewUniform = glContext.getUniformLocation(activeShaderProgram, "uModelViewMatrix");
    const projectionUniform = glContext.getUniformLocation(activeShaderProgram, "uProjectionMatrix");
    // This is the uniform for setting color per triangle
    const colorUniform = glContext.getUniformLocation(activeShaderProgram, "uColor");

    // This is the buffer that will be used when drawing each triangle
    const triangleBuffer = glContext.createBuffer();
    glContext.enableVertexAttribArray(positionAttrib);

    // These are the camera settings
    const targetCenter = vec3.fromValues(0.0, 0.0, 0.0);
    const cameraUpVector = vec3.fromValues(0.0, 1.0, 0.0);
    let cameraRadius = 5.0;
    let cameraTheta = Math.PI / 6;
    let cameraPhi = Math.PI / 4;

    // This is an event listener that updates the sphere as the user interacts with the slider
    subdivisionControl.oninput = (event) => {
        const recursionLevel = parseInt(event.target.value, 10);
        sphereData = createSphereBuffers(glContext, recursionLevel);
        console.log("Subdivision level updated:", recursionLevel);
    };

    // This is the rendering function that will use the Painter's algorithm
    function renderSphere() {
        // First must clear the canvas
        glContext.clear(glContext.COLOR_BUFFER_BIT);

        // These are the calculations for the camera position and where the view and projection matrices are made
        const cameraPosition = vec3.fromValues(
            cameraRadius * Math.sin(cameraTheta) * Math.cos(cameraPhi),
            cameraRadius * Math.sin(cameraTheta) * Math.sin(cameraPhi),
            cameraRadius * Math.cos(cameraTheta)
        );
        const modelViewMatrix = mat4.lookAt(mat4.create(), cameraPosition, targetCenter, cameraUpVector);
        const projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 4, canvasElement.width / canvasElement.height, 0.1, 20.0);

        // This is where the matrices get passed to the shaders
        glContext.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);
        glContext.uniformMatrix4fv(projectionUniform, false, projectionMatrix);

        // This is turning off the built-in depth testing and face culling because the manual sorting will handle the draw order instead
        glContext.disable(glContext.DEPTH_TEST);
        glContext.disable(glContext.CULL_FACE);

        // This is making the array of triangles from the sphere data
        const triangles = [];
        const vertices = sphereData.vertices;
        const indices = sphereData.indices;

        // This is a for loop that will loop through the indices 3 at a time (because a triangle has 3 vertices)
        for (let i = 0; i < indices.length; i += 3) {
            const idx0 = indices[i] * 3;
            const idx1 = indices[i + 1] * 3;
            const idx2 = indices[i + 2] * 3;

            // This is grabbing values from the vertex array and using them to make the 3 vertices
            const v0 = vec3.fromValues(vertices[idx0], vertices[idx0 + 1], vertices[idx0 + 2]);
            const v1 = vec3.fromValues(vertices[idx1], vertices[idx1 + 1], vertices[idx1 + 2]);
            const v2 = vec3.fromValues(vertices[idx2], vertices[idx2 + 1], vertices[idx2 + 2]);

            // These lines transform the vertices into view space
            const v0_view = transformVertex(modelViewMatrix, v0);
            const v1_view = transformVertex(modelViewMatrix, v1);
            const v2_view = transformVertex(modelViewMatrix, v2);
            // This is the average depth of the triangle
            const avgDepth = (v0_view[2] + v1_view[2] + v2_view[2]) / 3;

            // This is pushing the triangle data into the array
            triangles.push({
                vertices: [...v0, ...v1, ...v2],
                avgDepth: avgDepth
            });
        }

        // Then the triangles get sorted from farthest to nearest
        triangles.sort((a, b) => a.avgDepth - b.avgDepth);

        // To make things look best every triangle is getting its own color from a gradient
        triangles.forEach((tri, index) => {
            const t = index / (triangles.length - 1);
            // We then create a color gradient that goes from farthest to nearest
            const r = t;
            const g = 0.0;
            const b = 1.0 - t;
            glContext.uniform4fv(colorUniform, [r, g, b, 1.0]);

            // These lines bind the current triangles vertices to the buffer and then draw it
            glContext.bindBuffer(glContext.ARRAY_BUFFER, triangleBuffer);
            glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(tri.vertices), glContext.STATIC_DRAW);
            glContext.vertexAttribPointer(positionAttrib, 3, glContext.FLOAT, false, 0, 0);
            glContext.drawArrays(glContext.TRIANGLES, 0, 3);
        });

        // This is calling the renderSphere function again for the next frame
        requestAnimationFrame(renderSphere);
    }

    // This is setting the clear color of the canvas and starting the loop
    glContext.clearColor(0.1, 0.1, 0.1, 1.0);
    renderSphere();
}

// This function is what enables the use of webGL
function initializeWebGLContext(canvasElement) {
    return canvasElement.getContext("webgl") || canvasElement.getContext("experimental-webgl");
}

// This is the function that sets up the shaders and makes the shader program
function setupShaders(glContext) {
    // vertex shader source code 
    const vertexShaderSource = `
attribute vec3 position;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
}
    `;

    // fragment shader source code
    const fragmentShaderSource = `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = uColor;
}
    `;

    // This is creating the vertex shader
    const vertexShader = glContext.createShader(glContext.VERTEX_SHADER);
    glContext.shaderSource(vertexShader, vertexShaderSource);
    glContext.compileShader(vertexShader);

    // This is creating the fragment shadar
    const fragmentShader = glContext.createShader(glContext.FRAGMENT_SHADER);
    glContext.shaderSource(fragmentShader, fragmentShaderSource);
    glContext.compileShader(fragmentShader);

    // This is creating the program and then attaching to shaders
    const shaderProgram = glContext.createProgram();
    glContext.attachShader(shaderProgram, vertexShader);
    glContext.attachShader(shaderProgram, fragmentShader);
    glContext.linkProgram(shaderProgram);
    glContext.useProgram(shaderProgram);

    // Then returning the program
    return shaderProgram;
}

// This is the function that makes the sphere geometry and returns buffers and raw data
function createSphereBuffers(glContext, recursionLevel = 3) {
    const vertices = [];
    const indices = [];

    // These are the starting vertices of a tetrahedron
    const initialA = vec3.fromValues(0.0, 0.0, -1.0);
    const initialB = vec3.fromValues(0.0, 0.942809, 0.333333);
    const initialC = vec3.fromValues(-0.816497, -0.471405, 0.333333);
    const initialD = vec3.fromValues(0.816497, -0.471405, 0.333333);

    // These calls are refining the tetrahedron into a sphere
    refineSphere(initialA, initialB, initialC, recursionLevel, vertices, indices);
    refineSphere(initialD, initialC, initialB, recursionLevel, vertices, indices);
    refineSphere(initialA, initialD, initialB, recursionLevel, vertices, indices);
    refineSphere(initialA, initialC, initialD, recursionLevel, vertices, indices);

    // This is creating and binding the vertex buffer
    const vertexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertices), glContext.STATIC_DRAW);

    // This is creating and binding the index buffer
    const indexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ELEMENT_ARRAY_BUFFER, indexBuffer);
    glContext.bufferData(glContext.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), glContext.STATIC_DRAW);

    // This is returning both the buffers and the raw data for use in the algorithm
    return {
        vertexBuffer,
        indexBuffer,
        indexCount: indices.length,
        vertices,
        indices
    };
}

// This is a recursive function that will refine the sphere's geometry
function refineSphere(v1, v2, v3, depth, vertices, indices) {
    if (depth === 0) {
        const indexOffset = vertices.length / 3;
        vertices.push(...v1, ...v2, ...v3);
        indices.push(indexOffset, indexOffset + 1, indexOffset + 2);
        return;
    }
    // This is calculating the midpoint of v1 and v2
    const mid12 = vec3.create();
    vec3.add(mid12, v1, v2);
    vec3.normalize(mid12, mid12);
    // This is calculating the midpoint of v2 and v3
    const mid23 = vec3.create();
    vec3.add(mid23, v2, v3);
    vec3.normalize(mid23, mid23);
    // This is calculating the midpoint of v3 and v1
    const mid31 = vec3.create();
    vec3.add(mid31, v3, v1);
    vec3.normalize(mid31, mid31);
    
    // These are recursive calls that will furhter refine the geometry
    refineSphere(v1, mid12, mid31, depth - 1, vertices, indices);
    refineSphere(v2, mid23, mid12, depth - 1, vertices, indices);
    refineSphere(v3, mid31, mid23, depth - 1, vertices, indices);
    refineSphere(mid12, mid23, mid31, depth - 1, vertices, indices);
}

// This is a helper function that transforms a vertex using a 4x4 matrix and then returns the vec3
function transformVertex(matrix, vertex) {
    const v = vec4.fromValues(vertex[0], vertex[1], vertex[2], 1.0);
    vec4.transformMat4(v, v, matrix);
    return [v[0], v[1], v[2]];
}

// Start the app! (:
startWebGLApp();

/**
 * REFERENCE:
 * Angel, E., & Shreiner, D. (2020). Interactive computer graphics (8th ed.). Pearson.
 * 
 *  Part of this code was borrowed from my module 6 critical thinking,
 *   which can be found: https://github.com/mmw18/graphics/tree/master/Module6
 * 
 *  This code in it's entirety has been remotely shared to my GitHub account, 
 *   which can be found: https://github.com/mmw18/graphics/tree/master/Module8
 */
