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
    // ── Gravity N-body: region varies per page to avoid text ────────────────
    var colors = ["#00bcd4", "#e040fb", "#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];
    var N = 50; // 50 particles → 1225 force pairs per frame
    var G = 1.5; // lower G → slower orbital speeds (v ∝ √G)
    var softSq = 144; // softening ε² = 12² px
    var damping = 0.9995; // near-conservative for slow, persistent orbits
    var particles = [];
    var els = [];

    // Per-page bbox fractions — chosen to stay in margins / below content.
    // publications: right gutter + lower half (bibliography is a centred column)
    // projects:     bottom-right quadrant (cards don't reach full width/height)
    // cv:           right strip, full height (CV is a narrow centred column)
    // default:      generous bottom-right area
    var pageCfgs = {
      "/publications/": { x0: 0.62, y0: 0.5, x1: 0.99, y1: 0.99 },
      "/projects/": { x0: 0.55, y0: 0.52, x1: 0.99, y1: 0.99 },
      "/cv/": { x0: 0.68, y0: 0.1, x1: 0.99, y1: 0.9 },
    };
    var cfg = pageCfgs[path] || { x0: 0.22, y0: 0.22, x1: 0.99, y1: 0.99 };

    function getBBox() {
      return {
        x0: window.innerWidth * cfg.x0,
        y0: window.innerHeight * cfg.y0,
        x1: window.innerWidth * cfg.x1,
        y1: window.innerHeight * cfg.y1,
      };
    }
    var bbox = getBBox();
    window.addEventListener("resize", function () {
      bbox = getBBox();
    });

    // Centre initial scatter on the midpoint of the chosen bbox
    var initBBox = getBBox();
    var cx0 = (initBBox.x0 + initBBox.x1) / 2;
    var cy0 = (initBBox.y0 + initBBox.y1) / 2;
    // Scatter up to 45% of bbox half-width/height so particles start inside
    var scatterX = (initBBox.x1 - initBBox.x0) * 0.45;
    var scatterY = (initBBox.y1 - initBBox.y0) * 0.45;

    // Step 1: scatter particles within the page-specific region
    for (var i = 0; i < N; i++) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(el);
      els.push(el);
      particles.push({
        x: cx0 + (Math.random() - 0.5) * 2 * scatterX,
        y: cy0 + (Math.random() - 0.5) * 2 * scatterY,
        vx: 0,
        vy: 0,
        m: 0.8 + Math.random() * 0.4,
      });
    }

    // Step 2: compute CoM, give each particle tangential orbital velocity
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
      particles[i].vx = (-vOrb * dy) / r + (Math.random() - 0.5) * 0.25;
      particles[i].vy = (vOrb * dx) / r + (Math.random() - 0.5) * 0.25;
    }

    // Pre-allocate acceleration arrays — avoids GC every frame
    var ax = new Float64Array(N);
    var ay = new Float64Array(N);

    // Feedback parameters — fires when the system collapses into a tight cluster
    var feedbackCooldown = 0; // frames remaining before feedback can fire again
    var feedbackCooldownMax = 420; // ~7 s at 60 fps before next allowed event
    var feedbackCheckInterval = 30; // re-evaluate clustering every 30 frames
    var feedbackFrame = 0;
    // Collapse threshold: 90th-percentile radius must be below this (stricter than RMS)
    var collapseThreshold = Math.min(scatterX, scatterY) * 0.28;
    var feedbackKick = 1.4; // speed injected per particle (px/frame)
    var maxSpeed = 3.5; // px/frame — cap post-kick velocity so nothing escapes bbox
    var pendingKicks = []; // [{idx, delay}] — wave-front queue
    var pendingKickFrame = 0;
    var kickCmx = 0,
      kickCmy = 0; // frozen at collapse event

    function gravStep() {
      var n = particles.length;
      ax.fill(0);
      ay.fill(0);
      var Lx = bbox.x1 - bbox.x0;
      var Ly = bbox.y1 - bbox.y0;
      var hLx = Lx / 2;
      var hLy = Ly / 2;

      // Recompute CoM (needed for feedback check and kick direction)
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

      // Periodically check for galaxy collapse and fire feedback if due
      feedbackFrame++;
      if (feedbackCooldown > 0) feedbackCooldown--;
      if (feedbackFrame % feedbackCheckInterval === 0 && feedbackCooldown === 0) {
        // Sort particles by distance from CoM — require 90th percentile inside threshold
        // so the whole population must have collapsed, not just the average
        var dists = [];
        for (var i = 0; i < n; i++) {
          var dcx = particles[i].x - cmx;
          var dcy = particles[i].y - cmy;
          dists.push({ idx: i, r: Math.sqrt(dcx * dcx + dcy * dcy) });
        }
        dists.sort(function (a, b) {
          return a.r - b.r;
        });
        var p90r = dists[Math.floor(n * 0.9)].r;

        if (p90r < collapseThreshold) {
          kickCmx = cmx;
          kickCmy = cmy;
          // Queue kicks closest-first — one per frame so the burst propagates outward
          pendingKicks = dists.map(function (d, rank) {
            return { idx: d.idx, delay: rank };
          });
          pendingKickFrame = 0;
          feedbackCooldown = feedbackCooldownMax;
        }
      }

      // Apply queued feedback kicks — wave-front moves outward one particle per frame
      if (pendingKicks.length > 0) {
        var stillPending = [];
        for (var k = 0; k < pendingKicks.length; k++) {
          var pk = pendingKicks[k];
          if (pendingKickFrame >= pk.delay) {
            var i = pk.idx;
            var dcx = particles[i].x - kickCmx;
            var dcy = particles[i].y - kickCmy;
            var rc = Math.sqrt(dcx * dcx + dcy * dcy);
            // True unit vector; random direction for any particle sitting exactly at CoM
            var rx, ry;
            if (rc < 1) {
              var ang = Math.random() * Math.PI * 2;
              rx = Math.cos(ang);
              ry = Math.sin(ang);
            } else {
              rx = dcx / rc;
              ry = dcy / rc;
            }
            // Kick falls off with distance: full strength at CoM, ~half at collapseThreshold
            var kickScale = collapseThreshold / (rc + collapseThreshold);
            particles[i].vx += feedbackKick * kickScale * rx;
            particles[i].vy += feedbackKick * kickScale * ry;
            var sp = Math.sqrt(particles[i].vx * particles[i].vx + particles[i].vy * particles[i].vy);
            if (sp > maxSpeed) {
              particles[i].vx = (particles[i].vx / sp) * maxSpeed;
              particles[i].vy = (particles[i].vy / sp) * maxSpeed;
            }
          } else {
            stillPending.push(pk);
          }
        }
        pendingKicks = stillPending;
        pendingKickFrame++;
      }

      // Pairwise softened gravity with minimum-image convention
      for (var i = 0; i < n; i++) {
        var pi = particles[i];
        for (var j = i + 1; j < n; j++) {
          var pj = particles[j];
          var dx = pj.x - pi.x;
          var dy = pj.y - pi.y;
          if (dx > hLx) dx -= Lx;
          else if (dx < -hLx) dx += Lx;
          if (dy > hLy) dy -= Ly;
          else if (dy < -hLy) dy += Ly;
          var r2 = dx * dx + dy * dy + softSq;
          var inv_r = 1 / Math.sqrt(r2);
          var inv_r3 = inv_r * inv_r * inv_r;
          ax[i] += G * pj.m * inv_r3 * dx;
          ay[i] += G * pj.m * inv_r3 * dy;
          ax[j] -= G * pi.m * inv_r3 * dx;
          ay[j] -= G * pi.m * inv_r3 * dy;
        }
      }

      for (var i = 0; i < n; i++) {
        particles[i].vx = (particles[i].vx + ax[i]) * damping;
        particles[i].vy = (particles[i].vy + ay[i]) * damping;
      }

      // Remove net CoM velocity every frame — gravity is momentum-conserving but
      // feedback kicks are not, so without this the CoM drifts after each event
      var vcmx = 0,
        vcmy = 0;
      for (var i = 0; i < n; i++) {
        vcmx += particles[i].m * particles[i].vx;
        vcmy += particles[i].m * particles[i].vy;
      }
      vcmx /= totalM;
      vcmy /= totalM;
      for (var i = 0; i < n; i++) {
        particles[i].vx -= vcmx;
        particles[i].vy -= vcmy;
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;

        // Periodic wrapping
        if (particles[i].x < bbox.x0) particles[i].x += Lx;
        else if (particles[i].x >= bbox.x1) particles[i].x -= Lx;
        if (particles[i].y < bbox.y0) particles[i].y += Ly;
        else if (particles[i].y >= bbox.y1) particles[i].y -= Ly;

        els[i].style.left = particles[i].x - 2.5 + "px";
        els[i].style.top = particles[i].y - 2.5 + "px";
      }

      requestAnimationFrame(gravStep);
    }

    gravStep();
  }
})();
