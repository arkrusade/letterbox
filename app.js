const group = {
  name: "The Faraway Club",
  friends: [
    { id: "maya", name: "Maya", initial: "M", city: "Lisbon, PT", color: "peach", checkedIn: true },
    { id: "jules", name: "Jules", initial: "J", city: "Brooklyn, NY", color: "blue", checkedIn: true },
    { id: "ari", name: "Ari", initial: "A", city: "Seoul, KR", color: "lilac", checkedIn: true },
    { id: "you", name: "You", initial: "Y", city: "Portland, OR", color: "green", checkedIn: false, isYou: true },
  ],
  issue: {
    id: "week-24",
    number: "24",
    title: "The things we keep",
    date: "June 16, 2024",
    dateLabel: "JUN 10 — 16",
    questions: [
      {
        id: "small-joy",
        text: "What’s a small thing that made your week feel like yours?",
        responses: [
          { personId: "maya", text: "The woman at my corner bakery remembered my order, even after I was away for a month. I carried that warm little bun around all morning." },
          { personId: "jules", text: "A long walk with my phone on airplane mode. I found a tiny garden hiding between two apartment buildings." },
          { personId: "ari", text: "My neighbor left tangerines outside my door. No note, just a little pile of sunshine." },
        ],
      },
      {
        id: "held-onto",
        text: "What’s something you’ve been holding onto lately?",
        responses: [
          { personId: "maya", text: "My dad’s old recipe notebook. His handwriting gets messier near the end, but the soup still tastes like home." },
          { personId: "jules", text: "A silly voice memo from my little sister. I listen when the subway gets too loud." },
          { personId: "ari", text: "The last few cool mornings before summer really arrives. I take the long way to work." },
        ],
      },
      {
        id: "wish-for",
        text: "What are you making a little more room for?",
        responses: [
          { personId: "maya", text: "Unplanned afternoons. My calendar and I are learning to be less serious." },
          { personId: "jules", text: "Dinner at home, with the good plates even when it’s just Tuesday." },
          { personId: "ari", text: "Calling people before I have a proper reason to. I miss them; that’s reason enough." },
        ],
      },
    ],
  },
};

const storageKey = `somewhere:${group.issue.id}:responses`;
const storedResponses = readSavedResponses();

function readSavedResponses() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, response]) =>
          response &&
          response.personId === "you" &&
          typeof response.text === "string",
      ),
    );
  } catch (error) {
    console.warn("Could not read saved responses.", error);
    return {};
  }
}

function allResponses(question) {
  const saved = storedResponses[question.id];
  return saved ? [...question.responses, saved] : question.responses;
}

function personById(id) {
  return group.friends.find((person) => person.id === id);
}

function avatarMarkup(person, extraClass = "") {
  return `<span class="avatar avatar--${person.color} ${extraClass}" aria-hidden="true">${person.initial}</span>`;
}

function renderHome() {
  const checkedIn = group.friends.filter((friend) =>
    group.issue.questions.some((question) =>
      allResponses(question).some((response) => response.personId === friend.id),
    ),
  ).length;
  const percentage = Math.round((checkedIn / group.friends.length) * 100);
  document.querySelector("#progress-count").textContent = `${checkedIn} of ${group.friends.length} checked in`;
  document.querySelector(".progress-track").setAttribute("aria-label", `${percentage} percent complete`);
  document.querySelector(".progress-track span").style.width = `${percentage}%`;

  const friendsWithResponses = group.friends.filter((friend) =>
    group.issue.questions.some((question) => allResponses(question).some((response) => response.personId === friend.id)),
  );
  document.querySelector("#progress-avatars").innerHTML = friendsWithResponses
    .map((person) => avatarMarkup(person))
    .join("");
  document.querySelector("#prompt-list").innerHTML = group.issue.questions
    .map((question, index) => {
      const responseCount = allResponses(question).length;
      const hasAnswered = Boolean(storedResponses[question.id]);
      return `
        <article class="prompt-card">
          <span class="prompt-number">0${index + 1}</span>
          <div class="prompt-copy">
            <h3>${question.text}</h3>
            <p>${responseCount} notes from your group</p>
          </div>
          <span class="prompt-answer ${hasAnswered ? "" : "prompt-answer--pending"}">
            ${hasAnswered ? "Answered" : "Your turn"}<span class="prompt-arrow" aria-hidden="true">→</span>
          </span>
        </article>`;
    })
    .join("");
  document.querySelector("#people-grid").innerHTML = group.friends
    .map((person) => {
      const hasResponded = group.issue.questions.some((question) =>
        allResponses(question).some((response) => response.personId === person.id),
      );
      return `
        <article class="person-card">
          <div class="person-top">
            ${avatarMarkup(person)}
            <div><div class="person-name">${person.isYou ? "You" : person.name}</div><div class="person-city">${person.city}</div></div>
          </div>
          <div class="person-status"><span class="status-dot ${hasResponded ? "" : "status-dot--waiting"}"></span>${hasResponded ? "In this week’s letter" : "Still to come"}</div>
        </article>`;
    })
    .join("");
}

function renderLetter() {
  const totalResponses = group.issue.questions.reduce((sum, question) => sum + allResponses(question).length, 0);
  document.querySelector("#letter-response-count").textContent = totalResponses;
  document.querySelector("#letter-body").innerHTML = group.issue.questions
    .map((question, index) => {
      const responses = allResponses(question);
      return `
        <section class="letter-question" aria-labelledby="question-${question.id}">
          <div class="letter-question-header">
            <span class="prompt-number">0${index + 1}</span>
            <h2 id="question-${question.id}">${question.text}</h2>
          </div>
          <div class="response-grid">
            ${responses
              .map((response) => {
                const person = personById(response.personId) || group.friends.find((friend) => friend.isYou);
                return `
                  <article class="response-card ${person.isYou ? "response-card--mine" : ""}">
                    <div class="response-author">
                      ${avatarMarkup(person)}
                      <strong>${person.isYou ? "You" : person.name}</strong>
                      <span>${person.city}</span>
                    </div>
                    <p>${escapeHtml(response.text)}</p>
                  </article>`;
              })
              .join("")}
          </div>
        </section>`;
    })
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

const dialog = document.querySelector("#compose-dialog");
const form = document.querySelector("#compose-form");
const questionSelect = document.querySelector("#question-select");
const answerInput = document.querySelector("#answer-input");
const toast = document.querySelector("#toast");
let toastTimeout;

questionSelect.innerHTML = group.issue.questions
  .map((question, index) => `<option value="${question.id}">0${index + 1} · ${question.text}</option>`)
  .join("");

function openComposer() {
  dialog.showModal();
  answerInput.focus();
}

function showView(viewName) {
  const home = viewName === "home";
  document.querySelector("#home-view").hidden = !home;
  document.querySelector("#letter-view").hidden = home;
  document.querySelectorAll(".nav-item[data-nav]").forEach((button) => {
    const active = button.dataset.nav === viewName;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function announce(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

document.querySelectorAll("[data-open-compose]").forEach((button) => button.addEventListener("click", openComposer));
document.querySelectorAll("[data-open-letter]").forEach((button) => button.addEventListener("click", () => showView("letter")));
document.querySelectorAll("[data-show-home]").forEach((button) => button.addEventListener("click", () => showView("home")));
document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.nav)));
document.querySelector("[data-close-compose]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
answerInput.addEventListener("input", () => {
  document.querySelector("#character-count").textContent = `${answerInput.value.length} / 600`;
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const questionId = questionSelect.value;
  const question = group.issue.questions.find((item) => item.id === questionId);
  const answer = answerInput.value.trim();
  if (!question || !answer) return;

  storedResponses[questionId] = { personId: "you", text: answer };
  try {
    localStorage.setItem(storageKey, JSON.stringify(storedResponses));
  } catch (error) {
    console.error("Could not save your response.", error);
    announce("Your note couldn’t be saved. Please try again.");
    return;
  }
  renderHome();
  renderLetter();
  form.reset();
  document.querySelector("#character-count").textContent = "0 / 600";
  dialog.close();
  announce("Your note is tucked into the letter.");
});

renderHome();
renderLetter();
