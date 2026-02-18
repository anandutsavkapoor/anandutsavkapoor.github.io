(function () {
  var colors = ["#00bcd4", "#e040fb", "#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];
  var count = 12;

  for (var i = 0; i < count; i++) {
    var el = document.createElement("div");
    el.className = "pixel-float";
    // Confine to bottom-right corner
    el.style.left = (78 + Math.random() * 22).toFixed(1) + "vw";
    el.style.top = (75 + Math.random() * 25).toFixed(1) + "vh";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    var duration = 8 + Math.random() * 6;
    var delay = -Math.random() * 12;
    el.style.animation = "pixelFloat " + duration + "s " + delay + "s infinite ease-in-out";
    document.body.appendChild(el);
  }
})();
