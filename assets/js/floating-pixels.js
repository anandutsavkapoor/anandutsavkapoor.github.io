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
      var palette = document.documentElement.getAttribute("data-theme") === "dark" ? colorsDark : colorsLight;
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
    // ── Toomre & Toomre galaxy flyby ──────────────────────────────────────
    var colCyan   = ["#00bcd4", "#4dd0e1", "#00acc1", "#26c6da"];
    var colPurple = ["#e040fb", "#ce93d8", "#ab47bc", "#ba68c8"];

    var G      = 1.5;
    var softSq = 100;  // softening ε² = 10² px
    var M_nuc  = 80;   // nucleus mass ≫ ring-particle mass
    var m_ring = 1.0;

    // Ring definitions: {r, n} — radius (px), particle count
    var ringsPrim = [{ r: 55, n: 10 }, { r: 90, n: 14 }, { r: 130, n: 18 }]; // primary
    var ringsComp = [{ r: 40, n: 8 },  { r: 65, n: 12 }];                     // companion

    var N_p1 = 42; // sum of ringsPrim[*].n
    var N_p2 = 20; // sum of ringsComp[*].n
    var N    = 2 + N_p1 + N_p2; // 64 total (2016 force pairs per frame)

    var particles = [];
    var els = [];

    function getBBox() {
      return { x0: 0, y0: 0, x1: window.innerWidth, y1: window.innerHeight };
    }
    var bbox = getBBox();
    window.addEventListener("resize", function () { bbox = getBBox(); });

    // ── Parabolic flyby orbit ──────────────────────────────────────────────
    // Galaxy 2 approaches galaxy 1 on a parabolic (E=0) trajectory.
    var W      = window.innerWidth;
    var H      = window.innerHeight;
    var r_peri = Math.min(W, H) * 0.22;             // periapsis distance (px)
    var M_enc  = 2 * M_nuc;                          // total mass driving the orbit
    var h_orb  = Math.sqrt(G * M_enc * 2 * r_peri); // specific angular momentum
    var theta0 = -1.7;                               // start angle from periapsis (rad)
    var r0     = 2 * r_peri / (1 + Math.cos(theta0)); // initial separation

    var c0 = Math.cos(theta0);
    var s0 = Math.sin(theta0);
    // Separation vector: nucleus 2 relative to nucleus 1 at t=0
    var rel_x = r0 * c0;
    var rel_y = r0 * s0;
    // Parabolic velocity: v_r = GM/h·sinθ, v_θ = h/r; then to Cartesian
    // r̂ = (cosθ, sinθ), θ̂ = (−sinθ, cosθ)
    var vr0    = (G * M_enc / h_orb) * s0;
    var vt0    = h_orb / r0;
    var vrel_x = vr0 * c0 - vt0 * s0;
    var vrel_y = vr0 * s0 + vt0 * c0;

    // Place CoM right-of-centre, clear of left text column
    var comx  = W * 0.65;
    var comy  = H * 0.50;
    var nuc1x = comx - rel_x * 0.5;
    var nuc1y = comy - rel_y * 0.5;
    var nuc2x = comx + rel_x * 0.5;
    var nuc2y = comy + rel_y * 0.5;
    // Equal-mass CoM frame: each nucleus carries half the relative velocity
    var v1x = -vrel_x * 0.5;
    var v1y = -vrel_y * 0.5;
    var v2x =  vrel_x * 0.5;
    var v2y =  vrel_y * 0.5;

    // ── Particle factory ───────────────────────────────────────────────────
    function addParticle(x, y, vx, vy, m, palette, big) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = palette[Math.floor(Math.random() * palette.length)];
      if (big) { el.style.width = "8px"; el.style.height = "8px"; }
      document.body.appendChild(el);
      els.push(el);
      particles.push({ x: x, y: y, vx: vx, vy: vy, m: m });
    }

    // Nuclei (index 0 = primary/cyan, index 1 = companion/purple)
    addParticle(nuc1x, nuc1y, v1x, v1y, M_nuc, colCyan,   true);
    addParticle(nuc2x, nuc2y, v2x, v2y, M_nuc, colPurple, true);

    // Ring particles in circular orbits around a nucleus
    function addRings(nx, ny, nvx, nvy, rings, palette) {
      for (var ri = 0; ri < rings.length; ri++) {
        var rr   = rings[ri].r;
        var nn   = rings[ri].n;
        var vOrb = Math.sqrt(G * M_nuc / rr); // Keplerian circular speed
        for (var j = 0; j < nn; j++) {
          var ang = (2 * Math.PI * j / nn) + (Math.random() - 0.5) * 0.15;
          var px  = nx + rr * Math.cos(ang);
          var py  = ny + rr * Math.sin(ang);
          var pvx = nvx - vOrb * Math.sin(ang); // tangential (CCW)
          var pvy = nvy + vOrb * Math.cos(ang);
          addParticle(px, py, pvx, pvy, m_ring, palette, false);
        }
      }
    }

    addRings(nuc1x, nuc1y, v1x, v1y, ringsPrim, colCyan);
    addRings(nuc2x, nuc2y, v2x, v2y, ringsComp, colPurple);

    // ── Pre-allocated acceleration arrays — no GC per frame ───────────────
    var ax = new Float32Array(N);
    var ay = new Float32Array(N);

    // ── Intermittent damping: free dynamics ~8 s, gentle cooling burst ~1.3 s ──
    var dampCycleOff = 480;   // frames without damping
    var dampCycleOn  = 80;    // frames with damping
    var dampStrength = 0.992; // per-frame velocity scale when active
    var dampFrame    = 0;

    function gravStep() {
      var n = particles.length;
      ax.fill(0);
      ay.fill(0);
      var Lx  = bbox.x1 - bbox.x0;
      var Ly  = bbox.y1 - bbox.y0;
      var hLx = Lx * 0.5;
      var hLy = Ly * 0.5;

      // Pairwise softened gravity with minimum-image convention
      for (var i = 0; i < n; i++) {
        var pi = particles[i];
        for (var j = i + 1; j < n; j++) {
          var pj = particles[j];
          var dx = pj.x - pi.x;
          var dy = pj.y - pi.y;
          if (dx >  hLx) dx -= Lx; else if (dx < -hLx) dx += Lx;
          if (dy >  hLy) dy -= Ly; else if (dy < -hLy) dy += Ly;
          var r2  = dx * dx + dy * dy + softSq;
          var inv = 1.0 / (r2 * Math.sqrt(r2)); // r2^{-3/2}
          ax[i] += G * pj.m * inv * dx;
          ay[i] += G * pj.m * inv * dy;
          ax[j] -= G * pi.m * inv * dx;
          ay[j] -= G * pi.m * inv * dy;
        }
      }

      // Intermittent damping: active for dampCycleOn frames every dampCycleOff frames
      dampFrame++;
      var d = 1.0;
      if (dampFrame > dampCycleOff) {
        d = dampStrength;
        if (dampFrame > dampCycleOff + dampCycleOn) dampFrame = 0;
      }

      // Velocity update with optional damping
      for (var i = 0; i < n; i++) {
        particles[i].vx = (particles[i].vx + ax[i]) * d;
        particles[i].vy = (particles[i].vy + ay[i]) * d;
      }

      // Subtract net CoM velocity — keeps system from drifting off-screen
      var totalM = 0;
      var vcmx   = 0;
      var vcmy   = 0;
      for (var i = 0; i < n; i++) {
        totalM += particles[i].m;
        vcmx   += particles[i].m * particles[i].vx;
        vcmy   += particles[i].m * particles[i].vy;
      }
      vcmx /= totalM;
      vcmy /= totalM;

      for (var i = 0; i < n; i++) {
        particles[i].vx -= vcmx;
        particles[i].vy -= vcmy;
        particles[i].x  += particles[i].vx;
        particles[i].y  += particles[i].vy;

        // Periodic wrapping
        if      (particles[i].x < bbox.x0)  particles[i].x += Lx;
        else if (particles[i].x >= bbox.x1) particles[i].x -= Lx;
        if      (particles[i].y < bbox.y0)  particles[i].y += Ly;
        else if (particles[i].y >= bbox.y1) particles[i].y -= Ly;

        els[i].style.left    = (particles[i].x - 2.5) + "px";
        els[i].style.top     = (particles[i].y - 2.5) + "px";
        els[i].style.opacity = 0.45;
      }

      requestAnimationFrame(gravStep);
    }

    gravStep();
  }
})();
