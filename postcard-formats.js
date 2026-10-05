document.querySelectorAll(".format-card").forEach((card) => {
  card.addEventListener("click", () => {
    const isFlipped = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", String(isFlipped));
    const formatName = card.getAttribute("aria-label").split(".")[0];
    card.setAttribute(
      "aria-label",
      `${formatName}. ${isFlipped ? "Showing the back. Activate to return to the answer." : "Turn over to see the back."}`,
    );
    card.querySelector(".format-front").setAttribute("aria-hidden", String(isFlipped));
    card.querySelector(".format-reverse").setAttribute("aria-hidden", String(!isFlipped));
  });
});

const paletteSelect = document.querySelector("#format-palette");
const paletteStorageKey = "postmarked:postcard-format-palette";
const paletteNames = ["postcard", "seaside", "lavender", "citrus"];

try {
  const savedPalette = localStorage.getItem(paletteStorageKey);
  if (paletteNames.includes(savedPalette)) {
    paletteSelect.value = savedPalette;
    document.body.dataset.palette = savedPalette;
  }
} catch (error) {
  console.warn("Could not read saved postcard palette.", error);
}

paletteSelect.addEventListener("change", () => {
  const palette = paletteSelect.value;
  if (!paletteNames.includes(palette)) return;
  document.body.dataset.palette = palette;
  try {
    localStorage.setItem(paletteStorageKey, palette);
  } catch (error) {
    console.error("Could not save postcard palette.", error);
  }
});
