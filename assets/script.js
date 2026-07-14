(() => {
  document.documentElement.classList.add("js");

  const button = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-navigation]");

  if (!button || !navigation) return;

  const closeNavigation = () => {
    button.setAttribute("aria-expanded", "false");
    navigation.dataset.open = "false";
  };

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    navigation.dataset.open = String(!isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) closeNavigation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      closeNavigation();
      button.focus();
    }
  });

  const media = window.matchMedia("(min-width: 705px)");
  media.addEventListener("change", (event) => {
    if (event.matches) closeNavigation();
  });
})();
