"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  varying vec2 v_uv;
  void main() {
    v_uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  varying vec2 v_uv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float time = u_time * 0.15;
    
    // Core brand neon colors
    vec3 colGreen = vec3(0.83, 1.0, 0.2);  // #d4ff33
    vec3 colCyan = vec3(0.0, 0.94, 1.0);   // #00f0ff
    vec3 colPurple = vec3(0.56, 0.17, 0.93); // neon purple
    
    // Wave calculations
    vec2 q = vec2(0.0);
    q.x = fbm(uv + time * 0.2);
    q.y = fbm(uv + vec2(1.0));
    
    vec2 r = vec2(0.0);
    r.x = fbm(uv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * time);
    r.y = fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * time);
    
    float f = fbm(uv + r);
    
    vec3 col = vec3(0.04, 0.04, 0.05); // deep canvas dark background
    
    col = mix(col, colGreen, clamp(f * f * 3.5, 0.0, 1.0) * 0.14);
    col = mix(col, colCyan, clamp(length(q), 0.0, 1.0) * 0.1);
    col = mix(col, colPurple, clamp(length(r.x), 0.0, 1.0) * 0.08);
    
    // Subtle vignette
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    vig = clamp(pow(16.0 * vig, 0.25), 0.0, 1.0);
    col *= vig;
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Helper to compile shader
    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(VERTEX_SHADER_SOURCE, gl.VERTEX_SHADER);
    const fs = compileShader(FRAGMENT_SHADER_SOURCE, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Set up full screen quad
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uResolution = gl.getUniformLocation(program, "u_resolution");

    let animationFrameId: number;
    const startTime = Date.now();

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = () => {
      resize();
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      gl.uniform1f(uTime, elapsedSeconds);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-30 h-full w-full bg-[#0a0a0b]"
    />
  );
}
