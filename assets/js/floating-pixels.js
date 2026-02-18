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

    var colors = ["#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];

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
        this.color = colors[Math.floor(Math.random() * colors.length)];
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
    var N = 12;
    var G = 4; // gravitational constant (px/frame units)
    var softSq = 2500; // softening ε² = 50² px — particles pass through
    // No damping: energy is conserved, orbits persist indefinitely
    var particles = [];
    var els = [];

    // Centre of the bottom-right quadrant
    var cx0 = window.innerWidth * 0.75;
    var cy0 = window.innerHeight * 0.75;

    for (var i = 0; i < N; i++) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(el);
      els.push(el);

      // Place on a ring with a bit of radial scatter
      var angle = (i / N) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
      var r = 60 + Math.random() * 80; // 60–140 px from centre
      var x = cx0 + r * Math.cos(angle);
      var y = cy0 + r * Math.sin(angle);

      // Circular orbital speed: v = sqrt(G * (N-1) * m_avg / r)
      // Approximation: treat all other mass as concentrated at centre
      var vOrb = Math.sqrt((G * (N - 1)) / r);
      // Tangential (counter-clockwise) + small radial jitter
      var vx = -vOrb * Math.sin(angle) + (Math.random() - 0.5) * 0.2;
      var vy = vOrb * Math.cos(angle) + (Math.random() - 0.5) * 0.2;

      particles.push({ x: x, y: y, vx: vx, vy: vy, m: 1.0 });
    }

    // Elastic bounding box — generous margin so orbits have room
    function getBBox() {
      return {
        x0: window.innerWidth * 0.38,
        y0: window.innerHeight * 0.38,
        x1: window.innerWidth * 0.99,
        y1: window.innerHeight * 0.99,
      };
    }
    var bbox = getBBox();
    window.addEventListener("resize", function () {
      bbox = getBBox();
    });

    function gravStep() {
      var n = particles.length;
      var ax = new Array(n).fill(0);
      var ay = new Array(n).fill(0);

      // Pairwise gravity (Newton's 3rd law, i < j)
      for (var i = 0; i < n; i++) {
        var pi = particles[i];
        for (var j = i + 1; j < n; j++) {
          var pj = particles[j];
          var dx = pj.x - pi.x;
          var dy = pj.y - pi.y;
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
        particles[i].vx += ax[i];
        particles[i].vy += ay[i];
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;

        // Elastic reflection — keeps simulation alive indefinitely
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
