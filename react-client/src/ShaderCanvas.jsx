import React, { useRef, useEffect } from 'react';

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// A beautiful, slow-moving, soft Aurora Borealis style cloud shader
const fragmentShaderSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  varying vec2 v_uv;

  // 2D Random
  float random (in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // 2D Noise
  float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      vec2 u = f*f*(3.0-2.0*f);

      return mix(a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
  }

  // Fractional Brownian Motion
  float fbm ( in vec2 st) {
      float value = 0.0;
      float amplitude = .5;
      for (int i = 0; i < 5; i++) {
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= .5;
      }
      return value;
  }

  void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      st.x *= u_resolution.x / u_resolution.y;

      vec2 q = vec2(0.);
      q.x = fbm( st + 0.00 * u_time);
      q.y = fbm( st + vec2(1.0));

      vec2 r = vec2(0.);
      r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.05*u_time );
      r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.05*u_time);

      float f = fbm(st+r);

      // Soft, elegant Aurora Colors (Deep Blue, Indigo, Violet, Cyan)
      vec3 color = mix(
          vec3(0.05, 0.05, 0.15), // Deep midnight blue base
          vec3(0.1, 0.3, 0.7),    // Cyan/Blue
          clamp((f*f)*4.0, 0.0, 1.0)
      );

      color = mix(
          color,
          vec3(0.4, 0.1, 0.6),    // Soft Violet
          clamp(length(q), 0.0, 1.0)
      );

      color = mix(
          color,
          vec3(0.1, 0.8, 0.8),    // Bright Cyan Highlights
          clamp(length(r.x), 0.0, 1.0)
      );

      // Enhance contrast slightly and add softness
      vec3 finalColor = color * (f * 1.5 + 0.2);

      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export default function ShaderCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId;
    const render = (time) => {
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: -1, pointerEvents: 'none'
      }}
    />
  );
}
