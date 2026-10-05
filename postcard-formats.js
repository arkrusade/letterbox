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
