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
    // ── Stochastic simulation: T&T flyby -or- damped N-body (chosen at random) ─
    var colCyan = ["#00bcd4", "#4dd0e1", "#00acc1", "#26c6da"];
    var colPurple = ["#e040fb", "#ce93d8", "#ab47bc", "#ba68c8"];
    var colMix = colCyan.concat(colPurple);

    var particles = [];
    var els = [];
    var simPaused = false;

    // Pause / resume toggle button
    var toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Pause Simulation";
    toggleBtn.style.cssText =
      "position:fixed;bottom:1.2rem;right:1.2rem;z-index:200;" +
      "background:none;border:1px solid currentColor;border-radius:3px;" +
      "padding:3px 8px;font:11px/1.4 'DM Sans',sans-serif;cursor:pointer;" +
      "opacity:0.35;transition:opacity .2s;color:inherit;pointer-events:auto;";
    toggleBtn.addEventListener("mouseenter", function () {
      toggleBtn.style.opacity = "0.8";
    });
    toggleBtn.addEventListener("mouseleave", function () {
      toggleBtn.style.opacity = simPaused ? "0.6" : "0.35";
    });
    toggleBtn.addEventListener("click", function () {
      simPaused = !simPaused;
      toggleBtn.textContent = simPaused ? "Resume Simulation" : "Pause Simulation";
      toggleBtn.style.opacity = simPaused ? "0.6" : "0.35";
      if (!simPaused) gravStep();
    });
    document.body.appendChild(toggleBtn);

    function getBBox() {
      return { x0: 0, y0: 0, x1: window.innerWidth, y1: window.innerHeight };
    }
    var bbox = getBBox();
    window.addEventListener("resize", function () {
      bbox = getBBox();
    });

    var W = window.innerWidth;
    var H = window.innerHeight;

    // Particle container — zoom is applied via CSS transform so physics is untouched
    var wrapDiv = document.createElement("div");
    wrapDiv.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;transform-origin:0 0;will-change:transform;";
    document.body.appendChild(wrapDiv);

    // Randomised physics — different every page load
    var G = 1.0 + Math.random() * 1.0; // 1.0–2.0
    var softSq = 144 + Math.random() * 236; // ε = 12–19 px
    var M_nuc = 60 + Math.random() * 40; // 60–100

    function addParticle(x, y, vx, vy, m, palette, big) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = palette[Math.floor(Math.random() * palette.length)];
      var hs = 1.5; // half-size for centering (default: 3px / 2)
      if (big) {
        el.style.width = "7px";
        el.style.height = "7px";
        el.style.borderRadius = "0";
        el.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
        hs = 3.5;
      }
      wrapDiv.appendChild(el);
      els.push(el);
      particles.push({ x: x, y: y, vx: vx, vy: vy, m: m, hs: hs });
    }

    var useTT = Math.random() < 0.5; // 50 % T&T flyby, 50 % damped N-body
    var kickMassRef = 1.0; // scaled in N-body branch to keep Δv N-invariant
    var mergeCapMass = Infinity; // set in N-body branch: 200 × m_single
    var mergeRemnantCap = Infinity; // set in N-body branch: 500 × m_single (total across all remnants)

    if (useTT) {
      // ── T&T flyby ICs: two disk galaxies on a parabolic encounter ─────────
      var ringsPrim = [
        { r: 50 + Math.random() * 20, n: 120 + Math.floor(Math.random() * 30) },
        { r: 85 + Math.random() * 25, n: 180 + Math.floor(Math.random() * 40) },
        { r: 130 + Math.random() * 30, n: 230 + Math.floor(Math.random() * 50) },
      ];
      var ringsComp = [
        { r: 35 + Math.random() * 15, n: 90 + Math.floor(Math.random() * 25) },
        { r: 60 + Math.random() * 20, n: 120 + Math.floor(Math.random() * 35) },
      ];

      var r_peri = Math.min(W, H) * (0.15 + Math.random() * 0.15);
      var M_enc = 2 * M_nuc;
      var h_orb = Math.sqrt(G * M_enc * 2 * r_peri);
      var theta0 = -(1.4 + Math.random() * 0.6); // -1.4 to -2.0 rad from periapsis
      var r0 = (2 * r_peri) / (1 + Math.cos(theta0));

      // Random orbit orientation — rotates the whole encounter plane
      var orbitAngle = Math.random() * Math.PI * 2;
      var oCos = Math.cos(orbitAngle);
      var oSin = Math.sin(orbitAngle);

      var c0 = Math.cos(theta0);
      var s0 = Math.sin(theta0);
      // Parabolic velocity: v_r = GM/h·sinθ, v_θ = h/r, then rotate
      var vr0 = ((G * M_enc) / h_orb) * s0;
      var vt0 = h_orb / r0;
      var rel_x_raw = r0 * c0;
      var rel_y_raw = r0 * s0;
      var rel_x = rel_x_raw * oCos - rel_y_raw * oSin;
      var rel_y = rel_x_raw * oSin + rel_y_raw * oCos;
      var vrel_x_raw = vr0 * c0 - vt0 * s0;
      var vrel_y_raw = vr0 * s0 + vt0 * c0;
      var vrel_x = vrel_x_raw * oCos - vrel_y_raw * oSin;
      var vrel_y = vrel_x_raw * oSin + vrel_y_raw * oCos;

      // CoM placed randomly right-of-centre, clear of left text column
      var comx = W * (0.55 + Math.random() * 0.2);
      var comy = H * (0.35 + Math.random() * 0.3);
      var nuc1x = comx - rel_x * 0.5;
      var nuc1y = comy - rel_y * 0.5;
      var nuc2x = comx + rel_x * 0.5;
      var nuc2y = comy + rel_y * 0.5;
      // Equal-mass CoM frame: each nucleus carries half the relative velocity
      var v1x = -vrel_x * 0.5;
      var v1y = -vrel_y * 0.5;
      var v2x = vrel_x * 0.5;
      var v2y = vrel_y * 0.5;

      addParticle(nuc1x, nuc1y, v1x, v1y, M_nuc, colCyan, true);
      addParticle(nuc2x, nuc2y, v2x, v2y, M_nuc, colPurple, true);

      // Fix total ring mass = M_nuc regardless of ring particle count,
      // so dynamics are invariant when N is scaled up or down.
      var N_ring_total = 0;
      for (var ri = 0; ri < ringsPrim.length; ri++) N_ring_total += ringsPrim[ri].n;
      for (var ri = 0; ri < ringsComp.length; ri++) N_ring_total += ringsComp[ri].n;
      var m_ring = M_nuc / N_ring_total;

      var addRings = function (nx, ny, nvx, nvy, rings, palette) {
        for (var ri = 0; ri < rings.length; ri++) {
          var rr = rings[ri].r;
          var nn = rings[ri].n;
          var vOrb = Math.sqrt((G * M_nuc) / rr); // Keplerian circular speed
          for (var j = 0; j < nn; j++) {
            var ang = (2 * Math.PI * j) / nn + (Math.random() - 0.5) * 0.2;
            addParticle(
              nx + rr * Math.cos(ang),
              ny + rr * Math.sin(ang),
              nvx - vOrb * Math.sin(ang),
              nvy + vOrb * Math.cos(ang),
              m_ring,
              palette,
              false
            );
          }
        }
      };
      addRings(nuc1x, nuc1y, v1x, v1y, ringsPrim, colCyan);
      addRings(nuc2x, nuc2y, v2x, v2y, ringsComp, colPurple);
    } else {
      // ── Damped N-body ICs: random scatter with Keplerian orbital velocities ─
      var N_body = 800;
      var cx0 = W * (0.5 + Math.random() * 0.3);
      var cy0 = H * (0.35 + Math.random() * 0.3);
      var scatterX = W * (0.12 + Math.random() * 0.12);
      var scatterY = H * (0.12 + Math.random() * 0.12);

      // First pass: positions for CoM calculation
      var tempPos = [];
      var totalM_body = 0;
      var cmx_body = 0;
      var cmy_body = 0;
      for (var i = 0; i < N_body; i++) {
        var m_i = 1.0;
        var x_i = cx0 + (Math.random() - 0.5) * 2 * scatterX;
        var y_i = cy0 + (Math.random() - 0.5) * 2 * scatterY;
        totalM_body += m_i;
        cmx_body += x_i * m_i;
        cmy_body += y_i * m_i;
        tempPos.push({ x: x_i, y: y_i, m: m_i });
      }
      cmx_body /= totalM_body;
      cmy_body /= totalM_body;
      // Normalise total mass to 100 so dynamics are invariant with N
      var massScale = 100 / totalM_body;
      for (var i = 0; i < N_body; i++) tempPos[i].m *= massScale;
      totalM_body = 100;
      // Scale feedback kicks so Δv is the same regardless of N:
      // fk = feedbackKick * kickMassRef / m_body, and m_body = totalM/N, so
      // kickMassRef = totalM_body / N_body restores Δv ≈ feedbackKick (as if m=1).
      kickMassRef = totalM_body / N_body;
      // Merged particles are capped at 100× the base single-particle mass.
      mergeCapMass = 200 * kickMassRef;
      // Total mass held across ALL merger remnants is capped at 200× m_single.
      mergeRemnantCap = 500 * kickMassRef;

      // Second pass: assign orbital velocities then add particles
      var speedFactor = 0.5 + Math.random() * 0.5;
      for (var i = 0; i < N_body; i++) {
        var dx_i = tempPos[i].x - cmx_body;
        var dy_i = tempPos[i].y - cmy_body;
        var r_i = Math.sqrt(dx_i * dx_i + dy_i * dy_i) + 1;
        var vO = Math.sqrt((G * totalM_body) / r_i) * speedFactor;
        addParticle(
          tempPos[i].x,
          tempPos[i].y,
          (-vO * dy_i) / r_i + (Math.random() - 0.5) * 0.3,
          (vO * dx_i) / r_i + (Math.random() - 0.5) * 0.3,
          tempPos[i].m,
          colMix,
          false
        );
      }
    }

    // Pre-allocated arrays — no GC per frame
    var N = particles.length;
    var ax = new Float32Array(N);
    var ay = new Float32Array(N);
    var dists = new Array(N);
    for (var i = 0; i < N; i++) dists[i] = { idx: i, r: 0 };
    var SNAP_COLS = 8,
      SNAP_ROWS = 8;
    var snapGrid = new Float32Array(SNAP_COLS * SNAP_ROWS); // coarse grid for snap reference
    var collapseCheckEvery = 60; // check collapse once per second, not every frame
    var collapseCheckFrame = 0;

    // Intermittent damping parameters (randomised for both modes)
    var dampCycleOff = 420 + Math.floor(Math.random() * 180); // 7–10 s at 60 fps
    var dampCycleOn = 60 + Math.floor(Math.random() * 60); // 1–2 s
    var dampStrength = 0.99 + Math.random() * 0.007; // 0.990–0.997
    var dampFrame = 0;

    // Collapse feedback — radial kicks when p90 radius drops below threshold
    var collapseThreshold = Math.min(W, H) * (0.08 + Math.random() * 0.08);
    var feedbackKick = useTT
      ? 2.0 + Math.random() * 1.0 // T&T: 2.0–3.0 px/frame
      : 0.5 + Math.random() * 1.0; // N-body: 0.5–1.5 px/frame
    var feedbackLambda = 3 + Math.random() * 7; // exponential scale length 3–10 px
    var maxSpeed = 4.0 + Math.random() * 2.0; // 4.0–6.0 px/frame
    var feedbackCooldown = 0;
    var feedbackCooldownMax = 360 + Math.floor(Math.random() * 120); // 6–8 s
    var feedbackCount = 0; // consecutive collapse triggers
    var feedbackCountThreshold = 3; // trigger rescue after this many
    var rescueDampFrames = 0; // frames remaining in rescue phase (0 = inactive)
    var rescueDampDuration = 300 + Math.floor(Math.random() * 180); // 5–8 s
    var rescueDampStrength = 0.97 + Math.random() * 0.015; // 0.970–0.985
    var KE_preDamp = 0; // kinetic energy snapshot taken when rescue damping activates
    var postRescueKicksLeft = 0; // remaining post-rescue kicks with boosted strength
    var particleOpacity = 0.45;

    // Adaptive zoom — all tracking starts only after totalFeedbackFired >= 3
    var zoomLevel = 1.0;
    var maxZoom = 2.0; // adaptive — set from structure radius each frame
    var smoothRadius = -1; // -1 = uninitialised; mass-weighted RMS radius from CoM
    var emaKE_slow = -1; // τ≈5.5 s (α=0.003); -1 = uninitialised
    var emaKE_verySlow = -1; // τ≈17 s (α=0.001); ratio slow/verySlow signals stationarity
    var totalFeedbackFired = 0;
    var smoothCmx = -1; // -1 = uninitialised; snapped to cmx on gate opening (no initial drift)
    var smoothCmy = -1;
    var heatingFrames = 0; // leaky counter; zoom-out only fires when this reaches 120 (~2 s)
    var cmSmoothRate = useTT ? 0.03 : 0.01; // N-body seeding shifts CoM → slower pivot (τ≈1.7 s)
    var smoothMaxZoom = -1; // EMA of maxZoom — absorbs radius fluctuations from outlier kicks

    function gravStep() {
      var n = particles.length;
      ax.fill(0);
      ay.fill(0);
      var Lx = bbox.x1 - bbox.x0;
      var Ly = bbox.y1 - bbox.y0;
      var hLx = Lx * 0.5;
      var hLy = Ly * 0.5;

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
          var inv = 1.0 / (r2 * Math.sqrt(r2)); // r2^{-3/2}
          ax[i] += G * pj.m * inv * dx;
          ay[i] += G * pj.m * inv * dy;
          ax[j] -= G * pi.m * inv * dx;
          ay[j] -= G * pi.m * inv * dy;
        }
      }

      // Recompute CoM (needed for feedback and velocity correction)
      var totalM = 0;
      var cmx = 0;
      var cmy = 0;
      for (var i = 0; i < n; i++) {
        totalM += particles[i].m;
        cmx += particles[i].x * particles[i].m;
        cmy += particles[i].y * particles[i].m;
      }
      cmx /= totalM;
      cmy /= totalM;

      // Snap to centre if the densest cell of an 8×8 coarse grid is on the border (~12.5%).
      // O(N) bin pass — pre-allocated, no GC. Edge cell = trigger, no pixel margin needed.
      snapGrid.fill(0);
      for (var i = 0; i < n; i++) {
        var gc = Math.min(SNAP_COLS - 1, Math.max(0, Math.floor(((particles[i].x - bbox.x0) / Lx) * SNAP_COLS)));
        var gr = Math.min(SNAP_ROWS - 1, Math.max(0, Math.floor(((particles[i].y - bbox.y0) / Ly) * SNAP_ROWS)));
        snapGrid[gr * SNAP_COLS + gc] += particles[i].m;
      }
      var bestCell = 0;
      for (var ci = 1; ci < SNAP_COLS * SNAP_ROWS; ci++) {
        if (snapGrid[ci] > snapGrid[bestCell]) bestCell = ci;
      }
      var bestCol = bestCell % SNAP_COLS;
      var bestRow = Math.floor(bestCell / SNAP_COLS);
      if ((bestCol === 0 || bestCol === SNAP_COLS - 1 || bestRow === 0 || bestRow === SNAP_ROWS - 1) && snapGrid[bestCell] > 0.5 * totalM) {
        var refX = bbox.x0 + ((bestCol + 0.5) / SNAP_COLS) * Lx;
        var refY = bbox.y0 + ((bestRow + 0.5) / SNAP_ROWS) * Ly;
        var shiftX = bbox.x0 + Lx * 0.5 - refX;
        var shiftY = bbox.y0 + Ly * 0.5 - refY;
        for (var i = 0; i < n; i++) {
          particles[i].x += shiftX;
          particles[i].y += shiftY;
        }
        cmx += shiftX;
        cmy += shiftY;
        particleOpacity = 0; // fade out to mask the snap
      }

      // Collapse detection: check once per second (not every frame) to avoid GC churn
      if (feedbackCooldown > 0) {
        feedbackCooldown--;
      } else if (++collapseCheckFrame >= collapseCheckEvery) {
        collapseCheckFrame = 0;
        // Update pre-allocated dists in-place — no object allocation
        for (var i = 0; i < n; i++) {
          var dcx = particles[i].x - cmx;
          var dcy = particles[i].y - cmy;
          dists[i].idx = i;
          dists[i].r = Math.sqrt(dcx * dcx + dcy * dcy);
        }
        dists.sort(function (a, b) {
          return a.r - b.r;
        });
        if (dists[Math.floor(n * 0.9)].r < collapseThreshold) {
          // Concentration factor: amplify kicks when particles pile up at CoM.
          // p50 ≪ collapseThreshold → concFactor → large (capped at 6×).
          var p50 = dists[Math.floor(n * 0.5)].r;
          var concFactor = Math.min(collapseThreshold / (p50 + Math.sqrt(softSq)), 6.0);
          // Density centre: mass-weighted centre of the most concentrated cluster.
          // O(N²) search — fires at most once per cooldown (6–8 s), negligible cost.
          var kickRadius = feedbackLambda * 3;
          var kickRadSq = kickRadius * kickRadius;
          var bestCount = 0;
          var dcenterX = cmx;
          var dcenterY = cmy;
          for (var ii = 0; ii < n; ii++) {
            var cnt = 0;
            var wx = 0;
            var wy = 0;
            var wm = 0;
            for (var jj = 0; jj < n; jj++) {
              var ddx = particles[jj].x - particles[ii].x;
              var ddy = particles[jj].y - particles[ii].y;
              if (ddx * ddx + ddy * ddy < kickRadSq) {
                cnt++;
                wx += particles[jj].x * particles[jj].m;
                wy += particles[jj].y * particles[jj].m;
                wm += particles[jj].m;
              }
            }
            if (cnt > bestCount) {
              bestCount = cnt;
              dcenterX = wx / wm;
              dcenterY = wy / wm;
            }
          }
          // Mass redistribution (N-body only): particle closest to density centre
          // gains 5×m_single per collapse; that mass (+ momentum) is taken from
          // the 8 nearest qualifying neighbours [0.25, 1] × m_single.
          // Runs BEFORE the kick so force-based Δv=F/m sees the updated masses.
          if (!useTT) {
            var seedIdx = 0;
            var minDcDist = Infinity;
            for (var si = 0; si < n; si++) {
              var sdx = particles[si].x - dcenterX;
              var sdy = particles[si].y - dcenterY;
              var sdist = sdx * sdx + sdy * sdy;
              if (sdist < minDcDist) {
                minDcDist = sdist;
                seedIdx = si;
              }
            }
            var seed = particles[seedIdx];
            // Respect individual cap and total remnant cap
            var totalRemMass = 0;
            for (var ri = 0; ri < n; ri++) {
              if (particles[ri].m > kickMassRef) totalRemMass += particles[ri].m;
            }
            var gainM = Math.min(seed.m, mergeCapMass - seed.m, Math.max(0, mergeRemnantCap - totalRemMass));
            if (gainM > 0) {
              // Find 16 nearest neighbours with mass in (0.25, 1] × m_single
              var nbrs = [];
              for (var ni = 0; ni < n; ni++) {
                if (ni === seedIdx) continue;
                var nm = particles[ni].m;
                if (nm > 0.1 * kickMassRef && nm <= kickMassRef) {
                  var ndx = particles[ni].x - seed.x;
                  var ndy = particles[ni].y - seed.y;
                  nbrs.push({ idx: ni, d2: ndx * ndx + ndy * ndy });
                }
              }
              nbrs.sort(function (a, b) {
                return a.d2 - b.d2;
              });
              if (nbrs.length > 16) nbrs.length = 16;
              if (nbrs.length > 0) {
                var lossEach = gainM / nbrs.length;
                // Accumulate transferred momentum for seed velocity update
                var newSeedPx = seed.m * seed.vx;
                var newSeedPy = seed.m * seed.vy;
                var actualGain = 0;
                for (var ei = 0; ei < nbrs.length; ei++) {
                  var pn = particles[nbrs[ei].idx];
                  var actualLoss = Math.min(lossEach, pn.m - 0.1 * kickMassRef);
                  newSeedPx += actualLoss * pn.vx;
                  newSeedPy += actualLoss * pn.vy;
                  pn.m -= actualLoss;
                  actualGain += actualLoss;
                }
                seed.m += actualGain;
                // Update seed velocity to conserve momentum
                seed.vx = newSeedPx / seed.m;
                seed.vy = newSeedPy / seed.m;
                // Update seed visual: triangle, size ∝ m^(1/3), clamped 5–14 px
                if (seed.m > 1.5 * kickMassRef) {
                  var seedSize = Math.min(14, Math.max(5, 5 * Math.pow(seed.m / kickMassRef, 1 / 3)));
                  seed.hs = seedSize / 2;
                  els[seedIdx].style.width = seedSize + "px";
                  els[seedIdx].style.height = seedSize + "px";
                  els[seedIdx].style.borderRadius = "0";
                  els[seedIdx].style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
                }
              }
            }
          }

          // Compute distances from density centre for all particles.
          // p90 of these distances is used as the effective kick radius so that
          // outlier particles (well outside the dense core) are never kicked.
          var dcDistArr = new Array(n);
          for (var k = 0; k < n; k++) {
            var ddx = particles[k].x - dcenterX;
            var ddy = particles[k].y - dcenterY;
            dcDistArr[k] = Math.sqrt(ddx * ddx + ddy * ddy);
          }
          var dcDistSorted = dcDistArr.slice().sort(function (a, b) {
            return a - b;
          });
          var p90_dc = dcDistSorted[Math.floor(n * 0.9)];
          var effectiveKickRad = Math.min(p90_dc, kickRadius);
          var effectiveKickRadSq = effectiveKickRad * effectiveKickRad;
          // Kick particles within the effective radius of the density centre
          var kickBoost =
            postRescueKicksLeft > 0
              ? useTT
                ? 2.0 + Math.random() * 2.0 // T&T: 2–4×
                : 0.25 + Math.random() * 2.25 // N-body: 0.25–2.5×
              : 1.0;
          var kickDpx = 0;
          var kickDpy = 0;
          var kickMass = 0;
          for (var k = 0; k < n; k++) {
            var rc = dcDistArr[k];
            if (rc * rc > effectiveKickRadSq) continue;
            var dcx = particles[k].x - dcenterX;
            var dcy = particles[k].y - dcenterY;
            // Exponential radial profile centred on density peak
            var kickScale = Math.exp(-rc / feedbackLambda);
            // Velocity factor: kick slow (CoM-frame) particles more strongly
            var sp = Math.sqrt(particles[k].vx * particles[k].vx + particles[k].vy * particles[k].vy);
            var velFactor = Math.max(0, 1 - sp / maxSpeed);
            var rx, ry;
            if (rc < 1) {
              var ang = Math.random() * Math.PI * 2;
              rx = Math.cos(ang);
              ry = Math.sin(ang);
            } else {
              rx = dcx / rc; // radially outward from density centre
              ry = dcy / rc;
            }
            var vx0 = particles[k].vx;
            var vy0 = particles[k].vy;
            // Force-based kick: Δv = F/m; kickMassRef normalises N-body to m=1 equivalent
            var fk = (feedbackKick * kickMassRef * kickBoost * concFactor * kickScale * velFactor) / particles[k].m;
            particles[k].vx += fk * rx;
            particles[k].vy += fk * ry;
            var spAfter = Math.sqrt(particles[k].vx * particles[k].vx + particles[k].vy * particles[k].vy);
            if (spAfter > maxSpeed) {
              particles[k].vx = (particles[k].vx / spAfter) * maxSpeed;
              particles[k].vy = (particles[k].vy / spAfter) * maxSpeed;
            }
            // Accumulate actual momentum change (after speed cap)
            kickDpx += particles[k].m * (particles[k].vx - vx0);
            kickDpy += particles[k].m * (particles[k].vy - vy0);
            kickMass += particles[k].m;
          }
          // Conserve momentum within the kicked cluster only — outlier particles
          // are untouched so they never receive a spurious correction nudge.
          if (kickMass > 0) {
            var kickDvcmx = kickDpx / kickMass;
            var kickDvcmy = kickDpy / kickMass;
            for (var k = 0; k < n; k++) {
              if (dcDistArr[k] * dcDistArr[k] > effectiveKickRadSq) continue;
              particles[k].vx -= kickDvcmx;
              particles[k].vy -= kickDvcmy;
            }
          }
          feedbackCooldown = feedbackCooldownMax;
          totalFeedbackFired++;
          if (postRescueKicksLeft > 0) postRescueKicksLeft--;
          feedbackCount++;
          if (feedbackCount >= feedbackCountThreshold && rescueDampFrames === 0) {
            rescueDampFrames = rescueDampDuration;
            feedbackCount = 0;
            // Snapshot KE so we can end rescue damping once energy is sufficiently drained
            KE_preDamp = 0;
            for (var ki = 0; ki < n; ki++) {
              KE_preDamp += 0.5 * particles[ki].m * (particles[ki].vx * particles[ki].vx + particles[ki].vy * particles[ki].vy);
            }
          }
        }
      }

      // Intermittent damping — rescue phase overrides normal schedule
      var d = 1.0;
      if (rescueDampFrames > 0) {
        d = rescueDampStrength;
        rescueDampFrames--;
        // End rescue damping early once KE has dropped to 1 % of pre-damping value;
        // clear cooldown so the next collapse check can immediately fire a kick.
        var KE_cur = 0;
        for (var ki = 0; ki < n; ki++) {
          KE_cur += 0.5 * particles[ki].m * (particles[ki].vx * particles[ki].vx + particles[ki].vy * particles[ki].vy);
        }
        if (KE_cur < 0.2 * KE_preDamp) {
          rescueDampFrames = 0;
          feedbackCooldown = 0;
          collapseCheckFrame = collapseCheckEvery; // force check on next frame
          postRescueKicksLeft = 3;
        }
      } else {
        dampFrame++;
        if (dampFrame > dampCycleOff) {
          d = dampStrength;
          if (dampFrame > dampCycleOff + dampCycleOn) dampFrame = 0;
        }
      }

      for (var i = 0; i < n; i++) {
        particles[i].vx = (particles[i].vx + ax[i]) * d;
        particles[i].vy = (particles[i].vy + ay[i]) * d;
      }

      // Subtract net CoM velocity — keeps system from drifting off-screen
      var vcmx = 0;
      var vcmy = 0;
      for (var i = 0; i < n; i++) {
        vcmx += particles[i].m * particles[i].vx;
        vcmy += particles[i].m * particles[i].vy;
      }
      vcmx /= totalM;
      vcmy /= totalM;

      if (particleOpacity < 0.45) particleOpacity = Math.min(0.45, particleOpacity + 0.45 / 40);

      // 0 = raw positions (gate closed or zoom=1), 1 = fully CoM-centred+zoomed
      var zoomFrac = smoothCmx < 0 ? 0 : Math.min(1.0, (zoomLevel - 1.0) / Math.max(0.001, maxZoom - 1.0));

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

        // Blend: raw position at zoomFrac=0; CoM-centred scaled position at zoomFrac=1
        var targetSx = Lx * 0.5 + (particles[i].x - smoothCmx) * zoomLevel;
        var targetSy = Ly * 0.5 + (particles[i].y - smoothCmy) * zoomLevel;
        els[i].style.left = particles[i].x + zoomFrac * (targetSx - particles[i].x) - particles[i].hs + "px";
        els[i].style.top = particles[i].y + zoomFrac * (targetSy - particles[i].y) - particles[i].hs + "px";
        els[i].style.opacity = particleOpacity;
      }

      // Everything below is gated on totalFeedbackFired >= 3
      if (totalFeedbackFired >= 3) {
        // Snap smoothCmx to cmx on first entry (no initial pan); then track with EMA
        if (smoothCmx < 0) {
          smoothCmx = cmx;
          smoothCmy = cmy;
        } else {
          smoothCmx += (cmx - smoothCmx) * cmSmoothRate;
          smoothCmy += (cmy - smoothCmy) * cmSmoothRate;
        }

        // Structure radius: mass-weighted RMS distance from CoM
        var rSumSq = 0;
        for (var zi = 0; zi < n; zi++) {
          var rdx = particles[zi].x - cmx;
          var rdy = particles[zi].y - cmy;
          rSumSq += (rdx * rdx + rdy * rdy) * particles[zi].m;
        }
        var rRMS = Math.sqrt(rSumSq / (totalM + 1e-9));
        if (smoothRadius < 0) smoothRadius = rRMS;
        smoothRadius += (rRMS - smoothRadius) * 0.003; // τ≈5.5 s
        // Smooth maxZoom with slow EMA — prevents zoom target from jumping when
        // outlier particles inflate the RMS radius after feedback kicks
        var rawMaxZoom = Math.max(1.2, Math.min(3.5, (Math.min(Lx, Ly) * 0.35) / (smoothRadius + 1e-9)));
        if (smoothMaxZoom < 0) smoothMaxZoom = rawMaxZoom;
        smoothMaxZoom += (rawMaxZoom - smoothMaxZoom) * 0.003;
        maxZoom = smoothMaxZoom;

        // Two-timescale KE stationarity
        var KE_zoom = 0;
        for (var zi2 = 0; zi2 < n; zi2++) {
          KE_zoom += particles[zi2].m * (particles[zi2].vx * particles[zi2].vx + particles[zi2].vy * particles[zi2].vy);
        }
        if (emaKE_slow < 0) {
          emaKE_slow = KE_zoom;
          emaKE_verySlow = KE_zoom;
        }
        emaKE_slow += (KE_zoom - emaKE_slow) * 0.003;
        emaKE_verySlow += (KE_zoom - emaKE_verySlow) * 0.001;
        var keRatio = emaKE_slow / (emaKE_verySlow + 1e-9);
        // Require sustained heating (≥120 frames ≈ 2 s) before zooming out —
        // brief kick peaks never reach the threshold
        if (keRatio > 1.15) {
          heatingFrames = Math.min(heatingFrames + 1, 300);
        } else {
          heatingFrames = Math.max(0, heatingFrames - 1);
        }
        var zoomDesired;
        if (heatingFrames >= 120) {
          zoomDesired = 1.0; // sustained heating — zoom out
        } else if (keRatio > 0.85) {
          zoomDesired = maxZoom; // equilibrium (or brief excursion) — zoom in
        } else {
          zoomDesired = zoomLevel; // contracting/cooling — hold
        }
        var zoomRate = zoomDesired > zoomLevel ? 0.003 : 0.008;
        zoomLevel += (zoomDesired - zoomLevel) * zoomRate;
      }

      if (!simPaused) {
        var stepDelay = Math.round(zoomFrac * 50); // 0 ms at zoom=1, ~50 ms at full zoom
        if (stepDelay > 0) {
          setTimeout(function () {
            requestAnimationFrame(gravStep);
          }, stepDelay);
        } else {
          requestAnimationFrame(gravStep);
        }
      }
    }

    gravStep();
  }
})();
