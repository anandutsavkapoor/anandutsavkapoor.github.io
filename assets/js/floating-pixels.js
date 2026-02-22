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
    toggleBtn.textContent = "pause sim";
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
      toggleBtn.textContent = simPaused ? "resume sim" : "pause sim";
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

    // Randomised physics — different every page load
    var G = 1.0 + Math.random() * 1.0; // 1.0–2.0
    var softSq = 64 + Math.random() * 100; // ε = 8–13 px
    var M_nuc = 60 + Math.random() * 40; // 60–100

    function addParticle(x, y, vx, vy, m, palette, big) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = palette[Math.floor(Math.random() * palette.length)];
      if (big) {
        el.style.width = "5px";
        el.style.height = "5px";
      }
      document.body.appendChild(el);
      els.push(el);
      particles.push({ x: x, y: y, vx: vx, vy: vy, m: m });
    }

    var useTT = Math.random() < 0.5; // 50 % T&T flyby, 50 % damped N-body
    var kickMassRef = 1.0; // scaled in N-body branch to keep Δv N-invariant
    var mergeCapMass = Infinity; // set in N-body branch: 100 × m_single

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
      var N_body = 600 + Math.floor(Math.random() * 300); // 600–900
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
        var m_i = 0.8 + Math.random() * 0.4;
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
      mergeCapMass = 100 * kickMassRef;

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
    var collapseCheckEvery = 60; // check collapse once per second, not every frame
    var collapseCheckFrame = 0;

    // Intermittent damping parameters (randomised for both modes)
    var dampCycleOff = 420 + Math.floor(Math.random() * 180); // 7–10 s at 60 fps
    var dampCycleOn = 60 + Math.floor(Math.random() * 60); // 1–2 s
    var dampStrength = 0.99 + Math.random() * 0.007; // 0.990–0.997
    var dampFrame = 0;

    // Collapse feedback — radial kicks when p90 radius drops below threshold
    var collapseThreshold = Math.min(W, H) * (0.08 + Math.random() * 0.08);
    var feedbackKick = 2.0 + Math.random() * 1.0; // 2.0–3.0 px/frame
    var feedbackKickInit = feedbackKick; // baseline — additive ramp, cap 3×, then uniform [1×,3×]
    var lastDcenterX = W * 0.5; // cached density centre — updated each kick event
    var lastDcenterY = H * 0.5;
    var pendingMerge = false; // set at rescue exit; merge fires at end of that frame
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

      // Snap to centre if CoM drifts within 10 % of any viewport edge
      var edgeMargin = Math.min(Lx, Ly) * 0.1;
      if (cmx < bbox.x0 + edgeMargin || cmx > bbox.x1 - edgeMargin || cmy < bbox.y0 + edgeMargin || cmy > bbox.y1 - edgeMargin) {
        var snapX = Lx * 0.5;
        var snapY = Ly * 0.5;
        var shiftX = snapX - cmx;
        var shiftY = snapY - cmy;
        for (var i = 0; i < n; i++) {
          particles[i].x += shiftX;
          particles[i].y += shiftY;
        }
        cmx = snapX;
        cmy = snapY;
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
        // Mark stale slots (from prior merges) as far so they sort to the end
        for (var si = n; si < dists.length; si++) dists[si].r = 1e9;
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
          // Cache density centre for use in post-rescue merge targeting
          lastDcenterX = dcenterX;
          lastDcenterY = dcenterY;
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
                ? 3.0 + Math.random() * 7.0 // T&T: 3–10×
                : 0.3 + Math.random() * 2.7 // N-body: 0.3–3×
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
        if (KE_cur < 0.1 * KE_preDamp) {
          rescueDampFrames = 0;
          feedbackCooldown = 0;
          collapseCheckFrame = collapseCheckEvery; // force check on next frame
          postRescueKicksLeft = 3;
          if (!useTT) pendingMerge = true; // merge two core particles at end of frame
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

      // Post-rescue merge: absorb the two particles closest to the density centre.
      // Only runs in N-body mode, once per rescue event.
      if (!useTT && pendingMerge) {
        pendingMerge = false;
        var n_now = particles.length;
        var best1 = 0,
          best2 = 1,
          bestR1 = Infinity,
          bestR2 = Infinity;
        for (var mi = 0; mi < n_now; mi++) {
          var mdx = particles[mi].x - lastDcenterX;
          var mdy = particles[mi].y - lastDcenterY;
          var mr = mdx * mdx + mdy * mdy; // squared distance, no sqrt needed
          if (mr < bestR1) {
            bestR2 = bestR1;
            best2 = best1;
            bestR1 = mr;
            best1 = mi;
          } else if (mr < bestR2) {
            bestR2 = mr;
            best2 = mi;
          }
        }
        if (best1 !== best2) {
          // Keep best1 < best2 so the splice index is predictable
          if (best1 > best2) {
            var tmp = best1;
            best1 = best2;
            best2 = tmp;
          }
          var p1 = particles[best1],
            p2 = particles[best2];
          var combinedM = p1.m + p2.m;
          // Mass-weighted position and momentum, mass capped at mergeCapMass
          p1.x = (p1.x * p1.m + p2.x * p2.m) / combinedM;
          p1.y = (p1.y * p1.m + p2.y * p2.m) / combinedM;
          p1.vx = (p1.vx * p1.m + p2.vx * p2.m) / combinedM;
          p1.vy = (p1.vy * p1.m + p2.vy * p2.m) / combinedM;
          p1.m = Math.min(combinedM, mergeCapMass);
          // Remove merged-away particle from DOM and arrays
          document.body.removeChild(els[best2]);
          particles.splice(best2, 1);
          els.splice(best2, 1);
          // Ramp feedbackKick additively; once at 3× baseline, sample uniform [1×, 3×]
          if (feedbackKick < 3 * feedbackKickInit) {
            feedbackKick = Math.min(feedbackKick + feedbackKickInit * 0.2, 3 * feedbackKickInit);
          } else {
            feedbackKick = feedbackKickInit * (1 + Math.random() * 2);
          }
        }
      }

      if (!simPaused) requestAnimationFrame(gravStep);
    }

    gravStep();
  }
})();
