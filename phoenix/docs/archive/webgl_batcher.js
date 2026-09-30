/**
 * @file webgl_batcher.js
 * @description Zero-Allocation WebGL 2.0 2D Quad Batcher with Interleaved Vertex Attributes.
 * Compliant with PSGC-001 Invariants [INV-02], [INV-05], [INV-08], and ERL-HOT-ALLOC.
 * Timestamp: 2026-09-28T11:19:23-04:00
 */

'use strict';

class SovereignQuadBatcher {
    /**
     * @param {WebGL2RenderingContext} gl - Active WebGL 2.0 rendering context
     * @param {number} maxQuads - Maximum quad capacity per batch (default: 2048)
     */
    constructor(gl, maxQuads = 2048) {
        this.gl = gl;
        this.maxQuads = maxQuads;
        this.maxVertices = maxQuads * 4;
        this.maxIndices = maxQuads * 6;

        // Vertex layout: [x, y, u, v, r, g, b, a, texIndex] = 9 floats per vertex
        this.floatsPerVertex = 9;
        this.vertexStrideBytes = this.floatsPerVertex * 4;

        // Pre-allocate contiguous CPU heap buffers (PERSIST-001)
        this.vertexData = new ArrayBuffer(this.maxVertices * this.vertexStrideBytes);
        this.vertexFloatView = new Float32Array(this.vertexData);
        this.indexData = new Uint16Array(this.maxIndices);

        this.quadCount = 0;
        this.initializeIndices();
        this.initializeGPUResources();
    }

    /**
     * Pre-fills the static index buffer for quad rendering (two triangles per quad).
     */
    initializeIndices() {
        for (let i = 0, indexOffset = 0; i < this.maxQuads; i++, indexOffset += 4) {
            const baseIndex = i * 6;
            this.indexData[baseIndex + 0] = indexOffset + 0;
            this.indexData[baseIndex + 1] = indexOffset + 1;
            this.indexData[baseIndex + 2] = indexOffset + 2;
            this.indexData[baseIndex + 3] = indexOffset + 0;
            this.indexData[baseIndex + 4] = indexOffset + 2;
            this.indexData[baseIndex + 5] = indexOffset + 3;
        }
    }

    /**
     * Allocates GPU VBO, EBO, and VAO structures.
     */
    initializeGPUResources() {
        const gl = this.gl;

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

        this.ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);

        // Configure Vertex Attributes
        // 0: Position (vec2)
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, this.vertexStrideBytes, 0);

        // 1: TexCoords (vec2)
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, this.vertexStrideBytes, 8);

        // 2: Tint Color (vec4)
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, this.vertexStrideBytes, 16);

        // 3: Texture Unit Index (float)
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 1, gl.FLOAT, false, this.vertexStrideBytes, 32);

        gl.bindVertexArray(null);
    }

    /**
     * Resets batch state for a new frame.
     */
    begin() {
        this.quadCount = 0;
    }

    /**
     * Submits a textured quad into the vertex stream with zero heap allocations.
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} width - Quad width
     * @param {number} height - Quad height
     * @param {number} u0 - Source UV min X
     * @param {number} v0 - Source UV min Y
     * @param {number} u1 - Source UV max X
     * @param {number} v1 - Source UV max Y
     * @param {number} r - Red tint [0..1]
     * @param {number} g - Green tint [0..1]
     * @param {number} b - Blue tint [0..1]
     * @param {number} a - Alpha [0..1]
     * @param {number} texIndex - Bound texture unit index
     */
    drawQuad(x, y, width, height, u0, v0, u1, v1, r, g, b, a, texIndex = 0) {
        if (this.quadCount >= this.maxQuads) {
            this.flush();
            this.begin();
        }

        const offset = this.quadCount * this.floatsPerVertex * 4;
        const view = this.vertexFloatView;
        const x1 = x;
        const y1 = y;
        const x2 = x + width;
        const y2 = y + height;

        // Vertex 0: Top-Left
        view[offset + 0] = x1; view[offset + 1] = y1;
        view[offset + 2] = u0; view[offset + 3] = v0;
        view[offset + 4] = r;  view[offset + 5] = g;  view[offset + 6] = b; view[offset + 7] = a;
        view[offset + 8] = texIndex;

        // Vertex 1: Bottom-Left
        view[offset + 9] = x1;  view[offset + 10] = y2;
        view[offset + 11] = u0; view[offset + 12] = v1;
        view[offset + 13] = r;  view[offset + 14] = g;  view[offset + 15] = b; view[offset + 16] = a;
        view[offset + 17] = texIndex;

        // Vertex 2: Bottom-Right
        view[offset + 18] = x2; view[offset + 19] = y2;
        view[offset + 20] = u1; view[offset + 21] = v1;
        view[offset + 22] = r;  view[offset + 23] = g;  view[offset + 24] = b; view[offset + 25] = a;
        view[offset + 26] = texIndex;

        // Vertex 3: Top-Right
        view[offset + 27] = x2; view[offset + 28] = y1;
        view[offset + 29] = u1; view[offset + 30] = v0;
        view[offset + 31] = r;  view[offset + 32] = g;  view[offset + 33] = b; view[offset + 34] = a;
        view[offset + 35] = texIndex;

        this.quadCount++;
    }

    /**
     * Flushes the active vertex buffer to the GPU in a single draw call.
     */
    flush() {
        if (this.quadCount === 0) return;

        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        
        // Stream active vertex range without reallocating GPU memory
        const activeBytes = this.quadCount * 4 * this.vertexStrideBytes;
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexFloatView, 0, this.quadCount * 36);

        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.quadCount * 6, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);

        this.quadCount = 0;
    }
}