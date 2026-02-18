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
    var G = 6; // gravitational constant (tuned for px/frame units)
    var softSq = 625; // softening length² = 25² px — prevents singularities
    var damping = 0.985; // velocity damping per frame
    var springK = 0.0003; // spring constant pulling toward cluster centre
    var particles = [];
    var els = [];

    for (var i = 0; i < N; i++) {
      var el = document.createElement("div");
      el.className = "pixel-float";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(el);
      els.push(el);
      particles.push({
        x: window.innerWidth * (0.78 + Math.random() * 0.2),
        y: window.innerHeight * (0.75 + Math.random() * 0.22),
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        m: 0.8 + Math.random() * 0.4,
      });
    }

    function gravStep() {
      var n = particles.length;
      // Cluster anchor drifts gently with window size
      var cx = window.innerWidth * 0.89;
      var cy = window.innerHeight * 0.87;

      // Compute accelerations from old positions, then kick-drift
      var ax = new Array(n).fill(0);
      var ay = new Array(n).fill(0);

      for (var i = 0; i < n; i++) {
        var pi = particles[i];
        for (var j = i + 1; j < n; j++) {
          var pj = particles[j];
          var dx = pj.x - pi.x;
          var dy = pj.y - pi.y;
          var r2 = dx * dx + dy * dy + softSq;
          var inv_r = 1 / Math.sqrt(r2);
          var inv_r3 = inv_r * inv_r * inv_r;
          // a_i += G * m_j / r³ * (r_j − r_i)
          ax[i] += G * pj.m * inv_r3 * dx;
          ay[i] += G * pj.m * inv_r3 * dy;
          ax[j] -= G * pi.m * inv_r3 * dx;
          ay[j] -= G * pi.m * inv_r3 * dy;
        }
        // Soft spring toward cluster anchor
        ax[i] += springK * (cx - pi.x);
        ay[i] += springK * (cy - pi.y);
      }

      for (var i = 0; i < n; i++) {
        particles[i].vx = (particles[i].vx + ax[i]) * damping;
        particles[i].vy = (particles[i].vy + ay[i]) * damping;
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        // Offset by 4px to centre the 8×8 square on the particle position
        els[i].style.left = particles[i].x - 4 + "px";
        els[i].style.top = particles[i].y - 4 + "px";
      }

      requestAnimationFrame(gravStep);
    }

    gravStep();
  }
})();
