// script.js - General UI interactions for home page

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Toggle
  const menuToggle = document.getElementById("mobile-menu");
  const navList = document.querySelector(".nav-list");

  if (menuToggle && navList) {
    menuToggle.addEventListener("click", () => {
      navList.classList.toggle("active");
    });
  }

  // Smooth Scrolling for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
          });
          // Close mobile menu if open
          navList.classList.remove("active");
        }
      }
    });
  });

  // Optional: Add scroll animations here
  const observerOptions = {
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".section, .service-card, .project-card, .about-text, .contact-info, .contact-form, .hero-content").forEach((el) => {
    el.classList.add("fade-up-element");
    observer.observe(el);
  });

  // --- LENIS SMOOTH SCROLL ---
  if (typeof Lenis !== 'undefined') {
    window.lenis = new Lenis({
      duration: 2.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      smooth: true,
      mouseMultiplier: 0.8
    });
    function raf(time) {
      window.lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // --- ENSURE CORE UI ELEMENTS (Cursor & Canvas) ---
  function ensureCoreUI() {
    if (!document.getElementById('aurora-canvas')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'aurora-canvas';
      canvas.className = 'masked';
      document.body.prepend(canvas);
    }
    if (!document.getElementById('torch-cursor-img')) {
      const torch = document.createElement('div');
      torch.id = 'torch-cursor-img';
      torch.className = 'torch-cursor-img';
      document.body.prepend(torch);
    }
  }
  ensureCoreUI();

  // --- MOUSE TRACKING FOR SHADER ---
  let torchImg = document.getElementById('torch-cursor-img');
  let mX = window.innerWidth / 2, mY = window.innerHeight / 2;
  let tX = mX, tY = mY;

  window.addEventListener('mousemove', (e) => {
    mX = e.clientX;
    mY = e.clientY;
    document.body.style.setProperty("--mouse-x", `${mX}px`);
    document.body.style.setProperty("--mouse-y", `${mY}px`);
  });

  // Interaction Hover Logic (Premium UI)
  const interactiveElements = document.querySelectorAll('a, button, .service-card, .project-card, .nav-link, .logo, .footer-links a');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (torchImg) torchImg.classList.add('torch-hovering');
    });
    el.addEventListener('mouseleave', () => {
      if (torchImg) torchImg.classList.remove('torch-hovering');
    });
  });

  function animateTorch() {
    if (torchImg) {
      tX += (mX - tX) * 0.15;
      tY += (mY - tY) * 0.15;
      torchImg.style.left = `${tX}px`;
      torchImg.style.top = `${tY}px`;
    }
    requestAnimationFrame(animateTorch);
  }
  animateTorch();

  // --- RAW WEBGL AURORA SHADER ---
  const canvas = document.getElementById('aurora-canvas');
  if (canvas) {
    canvas.classList.add('masked');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
          v_uv = (a_position + 1.0) * 0.5;
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;
      const fsSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        varying vec2 v_uv;
        float random (in vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
        float noise (in vec2 st) {
            vec2 i = floor(st); vec2 f = fract(st);
            float a = random(i); float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm ( in vec2 st) {
            float value = 0.0; float amplitude = .5;
            for (int i = 0; i < 5; i++) { value += amplitude * noise(st); st *= 2.0; amplitude *= .5; }
            return value;
        }
        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            st.x *= u_resolution.x / u_resolution.y;
            vec2 q = vec2(0.);
            q.x = fbm( st + 0.00 * u_time); q.y = fbm( st + vec2(1.0));
            vec2 r = vec2(0.);
            r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.05*u_time );
            r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.05*u_time);
            float f = fbm(st+r);
            vec3 color = mix(vec3(0.05, 0.05, 0.2), vec3(0.1, 0.4, 0.9), clamp((f*f)*4.0, 0.0, 1.0));
            color = mix(color, vec3(0.4, 0.1, 0.7), clamp(length(q), 0.0, 1.0));
            color = mix(color, vec3(0.1, 0.7, 0.7), clamp(length(r.x), 0.0, 1.0));
            gl_FragColor = vec4(color * (f * 2.5 + 0.4), 1.0);
        }
      `;
      function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
      }
      const program = gl.createProgram();
      gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
      gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
      gl.linkProgram(program);
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const posAttr = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

      const resUniform = gl.getUniformLocation(program, "u_resolution");
      const timeUniform = gl.getUniformLocation(program, "u_time");

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      window.addEventListener('resize', resize);
      resize();

      const render = (time) => {
        gl.uniform2f(resUniform, canvas.width, canvas.height);
        gl.uniform1f(timeUniform, time * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
    }
  }

  // --- FLOATING WIDGETS INJECTION ---
  async function injectWidgets() {
    // WhatsApp Floating Button
    const whatsappBtn = document.createElement('a');
    whatsappBtn.href = "https://wa.me/919514518197";
    whatsappBtn.target = "_blank";
    whatsappBtn.className = "whatsapp-float";
    whatsappBtn.innerHTML = `<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp">`;
    whatsappBtn.setAttribute('aria-label', 'Chat with us on WhatsApp');
    
    // Visitor Counter Float
    const visitorCounter = document.createElement('div');
    visitorCounter.className = "visitor-counter-float";
    
    // Initial display before loading real data
    visitorCounter.innerHTML = `
      <div class="counter-icon-container">
        <div class="counter-icon"></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      </div>
      <div>Total Visitors: <span class="counter-value" id="count-display">...</span></div>
    `;
    
    document.body.appendChild(whatsappBtn);
    document.body.appendChild(visitorCounter);

    // Fetch and Track logic
    const formatNumber = (num) => {
        // Indian Number Formatting (e.g. 1,54,236)
        return new Intl.NumberFormat('en-IN').format(num);
    };

    try {
        // Use a session flag to avoid tracking multiple times per session
        const hasTracked = sessionStorage.getItem('tracked_visit');
        let endpoint = hasTracked ? '/api/analytics/visitors' : '/api/analytics/track';
        let method = hasTracked ? 'GET' : 'POST';
        
        const response = await fetch(API_BASE_URL + endpoint, { method });
        if (response.ok) {
            const data = await response.json();
            const display = document.getElementById('count-display');
            if (display) {
                display.textContent = formatNumber(data.count);
            }
            if (!hasTracked) sessionStorage.setItem('tracked_visit', 'true');
        }
    } catch (err) {
        console.warn("Analytics fetch failed, showing frank fallback.");
        const display = document.getElementById('count-display');
        if (display) display.textContent = formatNumber(154236);
    }
    
    // Add hover effects for the custom cursor
    [whatsappBtn, visitorCounter].forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (torchImg) torchImg.classList.add('torch-hovering');
      });
      el.addEventListener('mouseleave', () => {
        if (torchImg) torchImg.classList.remove('torch-hovering');
      });
    });
  }

  injectWidgets();
});
