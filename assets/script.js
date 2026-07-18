(() => {
  document.documentElement.classList.add("js");

  const button = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-nav]");

  const setOpen = (open) => {
    if (!button || !navigation) return;
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Close" : "Menu";
    navigation.dataset.open = String(open);
    document.body.classList.toggle("nav-open", open);
  };

  if (button && navigation) {
    button.addEventListener("click", () => {
      setOpen(button.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        button.focus();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (
        button.getAttribute("aria-expanded") === "true" &&
        !navigation.contains(event.target) &&
        !button.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    window.matchMedia("(min-width: 760px)").addEventListener("change", (event) => {
      if (event.matches) setOpen(false);
    });
  }

  for (const year of document.querySelectorAll("[data-current-year]")) {
    year.textContent = String(new Date().getFullYear());
  }
})();
