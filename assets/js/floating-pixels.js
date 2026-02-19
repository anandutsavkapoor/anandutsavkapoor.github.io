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

    function getBBox() {
      return {
        x0: 0,
        y0: 0,
        x1: window.innerWidth,
        y1: window.innerHeight,
      };
    }
    var bbox = getBBox();
    window.addEventListener("resize", function () {
      bbox = getBBox();
    });

    // Seed the cluster right-of-centre — clear of text (left column) and viewport edges.
    // CoM velocity is zeroed every frame so the structure stays near this point.
    var cx0 = window.innerWidth * 0.72;
    var cy0 = window.innerHeight * 0.5;
    var scatterX = window.innerWidth * 0.18; // compact enough to stay away from edges
    var scatterY = window.innerHeight * 0.22;

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
    // Collapse threshold: 90th-percentile radius must be below this (stricter than RMS)
    var collapseThreshold = Math.min(scatterX, scatterY) * 0.28;
    var feedbackKick = 1.5; // speed injected per particle (px/frame)
    var maxSpeed = 3.5; // px/frame — cap post-kick velocity so nothing escapes bbox
    var pendingKicks = []; // [{idx, delay}] — wave-front queue
    var pendingKickFrame = 0;
    var kickCmx = 0,
      kickCmy = 0; // frozen at collapse event
    var particleOpacity = 0.45; // fades to 0 on snap, recovers over ~40 frames

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

      // Check for galaxy collapse every frame — fires the instant the system collapses
      if (feedbackCooldown > 0) {
        feedbackCooldown--;
      } else {
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
          // Snap the collapsed cluster back to the seed point — invisible because
          // the system is already a tight ball, and gives a clean burst origin
          var shiftX = cx0 - cmx;
          var shiftY = cy0 - cmy;
          for (var i = 0; i < n; i++) {
            particles[i].x += shiftX;
            particles[i].y += shiftY;
          }
          kickCmx = cx0;
          kickCmy = cy0;
          particleOpacity = 0; // dim to invisible; fades back in during burst
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
      // Fade opacity back to 0.45 after a snap event (~40 frames = 0.7 s)
      if (particleOpacity < 0.45) particleOpacity = Math.min(0.45, particleOpacity + 0.45 / 40);
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
        els[i].style.opacity = particleOpacity;
      }

      requestAnimationFrame(gravStep);
    }

    gravStep();
  }
})();
