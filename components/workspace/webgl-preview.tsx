"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  varying vec2 v_uv;
  void main() {
    v_uv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5); // Flip Y for WebGL texture orientation
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform int u_filter; // 0=none, 1=warm, 2=glitch, 3=cyberpunk, 4=crt, 5=chromakey
  varying vec2 v_uv;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = v_uv;

    if (u_filter == 2) { // Glitch
      // Random horizontal offsets
      if (rand(vec2(floor(uv.y * 25.0), u_time)) > 0.82) {
        uv.x += 0.035 * sin(u_time * 24.0) * rand(vec2(uv.y, u_time));
      }
      
      // Chromatic Aberration
      vec4 r = texture2D(u_image, uv + vec2(0.006, 0.0));
      vec4 g = texture2D(u_image, uv);
      vec4 b = texture2D(u_image, uv - vec2(0.006, 0.0));
      gl_FragColor = vec4(r.r, g.g, b.b, 1.0);

    } else if (u_filter == 3) { // Cyberpunk Neon
      vec4 tex = texture2D(u_image, uv);
      // Cyan-magenta neon mapping
      float intensity = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
      vec3 cyber = mix(vec3(0.56, 0.17, 0.93), vec3(0.0, 0.94, 1.0), uv.x);
      gl_FragColor = vec4(mix(tex.rgb, cyber, 0.35) * 1.25, 1.0);

    } else if (u_filter == 4) { // CRT Scanline overlay
      vec4 tex = texture2D(u_image, uv);
      float scanline = sin(uv.y * u_resolution.y * 1.5) * 0.14;
      vec3 col = tex.rgb - scanline;
      // Curvature vignette
      float dist = distance(uv, vec2(0.5));
      col *= 1.0 - dist * dist * 0.28;
      gl_FragColor = vec4(col, 1.0);

    } else if (u_filter == 5) { // Chroma Key replacement
      vec4 tex = texture2D(u_image, uv);
      // Measure green dominant strength
      float greenStrength = tex.g - max(tex.r, tex.b);
      if (greenStrength > 0.12) {
        // Replace with neon overlay grid pattern
        float grid = step(0.96, fract(uv.x * 20.0)) + step(0.96, fract(uv.y * 20.0));
        vec3 pattern = mix(vec3(0.05, 0.05, 0.06), vec3(0.83, 1.0, 0.2), grid * 0.25);
        gl_FragColor = vec4(pattern, 1.0);
      } else {
        gl_FragColor = tex;
      }

    } else if (u_filter == 1) { // Warm Cinema
      vec4 tex = texture2D(u_image, uv);
      vec3 warm = vec3(tex.r * 1.15, tex.g * 1.03, tex.b * 0.88);
      gl_FragColor = vec4(warm, 1.0);

    } else { // None
      gl_FragColor = texture2D(u_image, uv);
    }
  }
`;

const filterMapping = {
  none: 0,
  warm: 1,
  glitch: 2,
  cyberpunk: 3,
  crt: 4,
  chromakey: 5,
};

export type VideoFilterType = keyof typeof filterMapping;

interface WebGLPreviewProps {
  videoElement: HTMLVideoElement | null;
  imageElement: HTMLImageElement | null;
  filter: VideoFilterType;
  zoom: number;
  positionX: number;
  positionY: number;
}

export function WebGLPreview({
  videoElement,
  imageElement,
  filter,
  zoom,
  positionX,
  positionY,
}: WebGLPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
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
      console.error("Program link failed:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Setup geometry (quad covering screen)
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

    // Setup texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Initial dummy texture data
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );

    const uTime = gl.getUniformLocation(program, "u_time");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uFilter = gl.getUniformLocation(program, "u_filter");

    let animId: number;
    const startTime = Date.now();

    const render = () => {
      let width = 640;
      let height = 360;

      // Adjust resolution based on source media size
      if (videoElement && videoElement.videoWidth) {
        width = videoElement.videoWidth;
        height = videoElement.videoHeight;
      } else if (imageElement && imageElement.naturalWidth) {
        width = imageElement.naturalWidth;
        height = imageElement.naturalHeight;
      }

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      // Bind current texture source
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (videoElement && videoElement.readyState >= 2) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
      } else if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageElement);
      }

      // Set shader uniforms
      const elapsed = (Date.now() - startTime) / 1000;
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1i(uFilter, filterMapping[filter] ?? 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
    };
  }, [videoElement, imageElement, filter]);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden transition-all duration-150 ease-out"
      style={{
        transform: `scale(${zoom / 100}) translate(${positionX * 8}px, ${positionY * 8}px)`,
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl border border-white/5"
      />
    </div>
  );
}
