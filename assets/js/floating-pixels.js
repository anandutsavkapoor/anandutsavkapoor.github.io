(function () {
  var canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  var ctx = canvas.getContext("2d");

  window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  var colors = ["#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  // Mean free path from exponential distribution: l = -log(ξ) * λ
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

      // Fade in/out
      var t = this.age / this.maxAge;
      var opacity = Math.min(t * 8, 1, (1 - t) * 8) * 0.35;

      var prevX = this.x;
      var prevY = this.y;
      this.x += this.dx * this.speed;
      this.y += this.dy * this.speed;
      this.traveled += this.speed;

      // Draw path segment
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = opacity;
      ctx.stroke();

      // Scattering event
      if (this.traveled >= this.mfp) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity * 1.5;
        ctx.fill();

        // New random direction (isotropic)
        var angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.mfp = drawMFP();
        this.traveled = 0;
      }

      // Reset if escaped
      if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) {
        this.reset();
      }

      ctx.globalAlpha = 1;
    },
  };

  photon.reset();

  function animate() {
    // Fast fade so trails don't persist long
    var fade = isDark() ? "rgba(33,33,33,0.12)" : "rgba(255,255,255,0.12)";
    ctx.fillStyle = fade;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    photon.step();
    requestAnimationFrame(animate);
  }

  animate();
})();
