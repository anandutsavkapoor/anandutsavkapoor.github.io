(function () {
  var path = window.location.pathname.replace(/\/$/, "") || "/";
  var isHome = path === "" || path === "/" || path === "/index.html";

  if (isHome) {
    // ── Monte Carlo photon random walk ──────────────────────────────────────
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:99;pointer-events:none;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext("2d");

    window.addEventListener("resize", function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    var colorsDark = ["#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];
    var colorsLight = ["#0097a7", "#7b1fa2", "#00838f", "#6a1b9a"];
    function pickColor() {
      var palette =
        document.documentElement.getAttribute("data-theme") === "dark" ? colorsDark : colorsLight;
      return palette[Math.floor(Math.random() * palette.length)];
    }

    function drawMFP() {
      return -Math.log(Math.random() + 1e-9) * 60;
    }

    var photon = {
      reset: function () {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        var angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.mfp = drawMFP();
        this.traveled = 0;
        this.color = pickColor();
        this.speed = 1.2 + Math.random() * 0.8;
        this.age = 0;
        this.maxAge = 500 + Math.random() * 300;
      },
      step: function () {
        this.age++;
        if (this.age > this.maxAge) {
          this.reset();
          return;
        }

        var t = this.age / this.maxAge;
        var opacity = Math.min(t * 8, 1, (1 - t) * 8) * 0.35;

        var prevX = this.x;
        var prevY = this.y;
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
        this.traveled += this.speed;

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = opacity;
        ctx.stroke();

        if (this.traveled >= this.mfp) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.globalAlpha = opacity * 1.5;
          ctx.fill();

          var angle = Math.random() * Math.PI * 2;
          this.dx = Math.cos(angle);
          this.dy = Math.sin(angle);
          this.mfp = drawMFP();
          this.traveled = 0;
        }

        if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) {
          this.reset();
        }

        ctx.globalAlpha = 1;
      },
    };

    var label = document.createElement("div");
    label.style.cssText =
      "position:fixed;bottom:1rem;left:1rem;z-index:102;pointer-events:none;font-family:monospace;font-size:0.65rem;opacity:0.35;letter-spacing:0.05em;";
    label.textContent = "Monte Carlo photon random walk";
    document.body.appendChild(label);

    photon.reset();
    var photons = [photon];
    for (var i = 1; i < 4; i++) {
      var p = Object.assign({}, photon);
      p.reset();
      p.age = Math.floor(Math.random() * p.maxAge);
      photons.push(p);
    }

    function animate() {
      // Fade trails to transparent so the grid behind stays visible
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";

      for (var i = 0; i < photons.length; i++) {
        photons[i].step();
      }
      requestAnimationFrame(animate);
    }

    animate();
  } else {
    // ── Gravity N-body: squares in bottom-right corner ──────────────────────
    var colors = ["#00bcd4", "#e040fb", "#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];
    var N = 20; // 20 particles → 190 force pairs per frame, still trivial
    var G = 1.5; // lower G → slower orbital speeds (v ∝ √G)
    var softSq = 144; // softening ε² = 12² px
    var damping = 0.9995; // near-conservative for slow, persistent orbits
    var particles = [];
    var els = [];

    var cx0 = window.innerWidth * 0.72;
    var cy0 = window.innerHeight * 0.72;

    // Step 1: scatter particles over a wider area (larger r → slower orbits, v ∝ 1/√r)
    for (var i = 0; i < N; i++) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(el);
      els.push(el);
      particles.push({
        x: cx0 + (Math.random() - 0.5) * 380,
        y: cy0 + (Math.random() - 0.5) * 380,
        vx: 0,
        vy: 0,
        m: 0.8 + Math.random() * 0.4,
      });
    }

    // Step 2: compute centre of mass, then give each particle the
    // tangential velocity for a circular orbit around the CoM.
    // v = sqrt(G * M_total / r) * 0.7  (0.7 corrects for distributed mass)
    var totalM = 0,
      cmx = 0,
      cmy = 0;
    for (var i = 0; i < N; i++) {
      totalM += particles[i].m;
      cmx += particles[i].x * particles[i].m;
      cmy += particles[i].y * particles[i].m;
    }
    cmx /= totalM;
    cmy /= totalM;

    for (var i = 0; i < N; i++) {
      var dx = particles[i].x - cmx;
      var dy = particles[i].y - cmy;
      var r = Math.sqrt(dx * dx + dy * dy) + 1;
      var vOrb = Math.sqrt((G * totalM) / r) * 0.7;
      // Counter-clockwise tangent + small radial scatter for ellipticity
      particles[i].vx = (-vOrb * dy) / r + (Math.random() - 0.5) * 0.25;
      particles[i].vy = (vOrb * dx) / r + (Math.random() - 0.5) * 0.25;
    }

    // Elastic bounding box — keeps simulation alive indefinitely
    function getBBox() {
      return {
        x0: window.innerWidth * 0.22,
        y0: window.innerHeight * 0.22,
        x1: window.innerWidth * 0.99,
        y1: window.innerHeight * 0.99,
      };
    }
    var bbox = getBBox();
    window.addEventListener("resize", function () {
      bbox = getBBox();
    });

    var mScale = 80; // tidal stripping scale radius (px)

    function gravStep() {
      var n = particles.length;
      var ax = new Array(n).fill(0);
      var ay = new Array(n).fill(0);

      // Recompute centre of mass each frame (base masses, not m_eff)
      var totalM = 0,
        cmx = 0,
        cmy = 0;
      for (var i = 0; i < n; i++) {
        totalM += particles[i].m;
        cmx += particles[i].x * particles[i].m;
        cmy += particles[i].y * particles[i].m;
      }
      cmx /= totalM;
      cmy /= totalM;

      // Effective mass: tanh ramp — particles near CoM exert less gravity
      // m_eff → 0 at centre, → m_base far away
      var mEff = new Array(n);
      for (var i = 0; i < n; i++) {
        var dcx = particles[i].x - cmx;
        var dcy = particles[i].y - cmy;
        var rCm = Math.sqrt(dcx * dcx + dcy * dcy);
        mEff[i] = particles[i].m * Math.tanh(rCm / mScale);
      }

      // Pairwise softened gravity — only m_eff governs outgoing attraction;
      // inertia stays at base mass to avoid numerical blow-up near centre
      for (var i = 0; i < n; i++) {
        var pi = particles[i];
        for (var j = i + 1; j < n; j++) {
          var pj = particles[j];
          var dx = pj.x - pi.x;
          var dy = pj.y - pi.y;
          var r2 = dx * dx + dy * dy + softSq;
          var inv_r = 1 / Math.sqrt(r2);
          var inv_r3 = inv_r * inv_r * inv_r;
          ax[i] += G * mEff[j] * inv_r3 * dx;
          ay[i] += G * mEff[j] * inv_r3 * dy;
          ax[j] -= G * mEff[i] * inv_r3 * dx;
          ay[j] -= G * mEff[i] * inv_r3 * dy;
        }
      }

      for (var i = 0; i < n; i++) {
        particles[i].vx = (particles[i].vx + ax[i]) * damping;
        particles[i].vy = (particles[i].vy + ay[i]) * damping;
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;

        // Elastic reflection off walls
        if (particles[i].x < bbox.x0) {
          particles[i].x = bbox.x0;
          particles[i].vx = Math.abs(particles[i].vx);
        } else if (particles[i].x > bbox.x1) {
          particles[i].x = bbox.x1;
          particles[i].vx = -Math.abs(particles[i].vx);
        }
        if (particles[i].y < bbox.y0) {
          particles[i].y = bbox.y0;
          particles[i].vy = Math.abs(particles[i].vy);
        } else if (particles[i].y > bbox.y1) {
          particles[i].y = bbox.y1;
          particles[i].vy = -Math.abs(particles[i].vy);
        }

        els[i].style.left = particles[i].x - 4 + "px";
        els[i].style.top = particles[i].y - 4 + "px";
      }

      requestAnimationFrame(gravStep);
    }

    gravStep();
  }
})();
