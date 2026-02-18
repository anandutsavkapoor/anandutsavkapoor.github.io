(function () {
  var colors = ["#00bcd4", "#e040fb", "#00bcd4", "#e040fb", "#4dd0e1", "#ce93d8"];
  var count = 22;

  for (var i = 0; i < count; i++) {
    var el = document.createElement("div");
    el.className = "pixel-float";
    el.style.left = Math.random() * 100 + "vw";
    el.style.top = Math.random() * 100 + "vh";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    var duration = 8 + Math.random() * 6;
    var delay = -Math.random() * 12;
    el.style.animation = "pixelFloat " + duration + "s " + delay + "s infinite ease-in-out";
    document.body.appendChild(el);
  }
})();
