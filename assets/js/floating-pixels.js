(function () {
  var canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;";
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

  function Photon() {
    this.reset();
  }

  // Mean free path drawn from exponential distribution: l = -log(ξ) * λ
  Photon.prototype.drawMFP = function () {
    return -Math.log(Math.random() + 1e-9) * 60;
  };

  Photon.prototype.reset = function () {
    // Emit from a random edge or interior point
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    var angle = Math.random() * Math.PI * 2;
    this.dx = Math.cos(angle);
    this.dy = Math.sin(angle);
    this.mfp = this.drawMFP();
    this.traveled = 0;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.speed = 1.2 + Math.random() * 0.8;
    this.age = 0;
    this.maxAge = 600 + Math.random() * 400;
  };

  Photon.prototype.step = function () {
    this.age++;
    if (this.age > this.maxAge) {
      this.reset();
      return;
    }

    // Fade out as photon ages
    var opacity = Math.min(1, (this.maxAge - this.age) / 80) * 0.55;

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
      // Mark scatter point
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = Math.min(opacity * 1.6, 0.9);
      ctx.fill();

      // New random direction (isotropic scattering)
      var angle = Math.random() * Math.PI * 2;
      this.dx = Math.cos(angle);
      this.dy = Math.sin(angle);
      this.mfp = this.drawMFP();
      this.traveled = 0;
    }

    // Reset if escaped off screen
    if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) {
      this.reset();
    }

    ctx.globalAlpha = 1;
  };

  var photons = [];
  for (var i = 0; i < 10; i++) {
    var p = new Photon();
    // Stagger starting ages so they don't all appear at once
    p.age = Math.floor(Math.random() * p.maxAge);
    photons.push(p);
  }

  function animate() {
    // Slowly fade old paths by painting a translucent background wash
    var fade = isDark() ? "rgba(33,33,33,0.04)" : "rgba(255,255,255,0.04)";
    ctx.globalAlpha = 1;
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < photons.length; i++) {
      photons[i].step();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
