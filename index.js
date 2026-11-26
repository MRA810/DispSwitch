document.addEventListener("DOMContentLoaded", () => {
  const btnHdmi = document.getElementById("btnHdmi");
  const btnDp = document.getElementById("btnDp");
  const readoutValue = document.getElementById("readoutValue");
  const footerText = document.getElementById("footerText");
  const footerDot = document.getElementById("footerDot");
  const railFill = document.getElementById("railFill");

  const buttons = { hdmi: btnHdmi, dp: btnDp };
  const labels = { hdmi: "HDMI", dp: "DisplayPort" };

  let current = "hdmi";
  let switching = false;

  function positionRail(target) {
    const rack = document.querySelector(".rack");
    const btn = buttons[target];
    if (!rack || !btn || !railFill) return;

    const rackTop = rack.getBoundingClientRect().top;
    const btnRect = btn.getBoundingClientRect();
    railFill.style.top = `${btnRect.top - rackTop}px`;
    railFill.style.height = `${btnRect.height}px`;
    setRailColor(target);
  }

  function setRailColor(target) {
    const computed = getComputedStyle(document.documentElement);
    railFill.style.background =
      target === "hdmi"
        ? computed.getPropertyValue("--hdmi").trim()
        : computed.getPropertyValue("--dp").trim();
  }

  // Pure UI update function
  function applyUIState(target) {
    btnHdmi.classList.toggle("active", target === "hdmi");
    btnDp.classList.toggle("active", target === "dp");
    btnHdmi.setAttribute("aria-pressed", target === "hdmi");
    btnDp.setAttribute("aria-pressed", target === "dp");

    const computed = getComputedStyle(document.documentElement);
    readoutValue.style.color =
      target === "hdmi"
        ? computed.getPropertyValue("--hdmi").trim()
        : computed.getPropertyValue("--dp").trim();
    readoutValue.textContent = labels[target];

    positionRail(target);
    current = target;
  }

  function selectInput(target) {
    if (target === current || switching) return;
    switching = true;

    // 1. Issue script trigger
    if (window.electronAPI && window.electronAPI.switchInput) {
      window.electronAPI.switchInput(target);
    }

    // 2. Temporarily reflect requested input state in UI
    applyUIState(target);

    // 3. Set pending status indicator (Hold until hardware verification completes)
    footerDot.classList.remove("live");
    footerText.textContent = "Switching…";
  }

  // User click handlers
  btnHdmi.addEventListener("click", () => selectInput("hdmi"));
  btnDp.addEventListener("click", () => selectInput("dp"));

  window.addEventListener("resize", () => positionRail(current));

  // --- HARDWARE STATE SYNC ---
  if (window.electronAPI) {
    // Listen for hardware state reports from ddcutil
    window.electronAPI.onActiveInputDetected((hardwareInput) => {
      // Sync UI state if hardware reports something different (e.g. fallback to HDMI)
      applyUIState(hardwareInput);

      // Release lock and mark connection live after hardware responds
      footerDot.classList.add("live");
      footerText.textContent = "Signal locked";
      switching = false;
    });

    // Request initial state check on launch
    window.electronAPI.getActiveInput();
  } else {
    positionRail(current);
  }
});
