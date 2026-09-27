const availableThemes = ["classic", "coastal", "postcard", "field-notes"];
const themeDetails = {
  classic: { name: "Somewhere" },
  coastal: { name: "The Coastline" },
  postcard: { name: "Postcards" },
  "field-notes": { name: "Field Notes" },
};
const requestedTheme = new URLSearchParams(window.location.search).get("theme");
if (availableThemes.includes(requestedTheme)) {
  document.body.dataset.theme = requestedTheme;
}
document.title = `${themeDetails[document.body.dataset.theme]?.name || "Somewhere"} — a little closer`;

function getCurrentWeek() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const thursday = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const weekNumber = 1 + Math.round((thursday - firstThursday) / 604800000);
  const monthLabel = (date) =>
    new Intl.DateTimeFormat(undefined, { month: "short" }).format(date).toUpperCase();
  const dateLabel =
    start.getMonth() === end.getMonth()
      ? `${monthLabel(start)} ${start.getDate()} — ${end.getDate()}`
      : `${monthLabel(start)} ${start.getDate()} — ${monthLabel(end)} ${end.getDate()}`;
  const dateKey = [start.getFullYear(), start.getMonth() + 1, start.getDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("-");

  return {
    id: `week-${dateKey}`,
    number: String(weekNumber).padStart(2, "0"),
    dateLabel,
    date: new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(end),
  };
}

const currentWeek = getCurrentWeek();
const group = {
  name: "The Faraway Club",
  friends: [
    { id: "maya", name: "Maya", initial: "M", city: "Lisbon, PT", color: "peach", checkedIn: true },
    { id: "jules", name: "Jules", initial: "J", city: "Brooklyn, NY", color: "blue", checkedIn: true },
    { id: "ari", name: "Ari", initial: "A", city: "Seoul, KR", color: "lilac", checkedIn: true },
    { id: "you", name: "You", initial: "Y", city: "Portland, OR", color: "green", checkedIn: false, isYou: true },
  ],
  issue: {
    ...currentWeek,
    title: "The things we keep",
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
  document.querySelector("#week-number").textContent = group.issue.number;
  document.querySelector("#letter-week-number").textContent = group.issue.number;
  document.querySelector("#week-date-label").textContent = group.issue.dateLabel;
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
        <button class="prompt-card" type="button" data-question-id="${question.id}" aria-label="Open notes for question ${index + 1}">
          <span class="prompt-number">0${index + 1}</span>
          <div class="prompt-copy">
            <h3>${question.text}</h3>
            <p>${responseCount} notes from your group</p>
          </div>
          <span class="prompt-answer ${hasAnswered ? "" : "prompt-answer--pending"}">
            ${hasAnswered ? "Answered" : "Your turn"}<span class="prompt-arrow" aria-hidden="true">→</span>
          </span>
        </button>`;
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
  document.querySelector("#letter-date").textContent = group.issue.date;
  const totalResponses = group.issue.questions.reduce((sum, question) => sum + allResponses(question).length, 0);
  document.querySelector("#letter-response-count").textContent = totalResponses;
  document.querySelector("#letter-body").innerHTML = group.issue.questions
    .map((question, index) => {
      const responses = allResponses(question);
      return `
        <section class="letter-question" aria-labelledby="question-${question.id}">
          <div class="letter-question-header">
            <span class="prompt-number">0${index + 1}</span>
            <h2 id="question-${question.id}"><button class="question-jump" type="button" data-question-id="${question.id}">${question.text}</button></h2>
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
let activeView = "home";
let suppressScrollSync = false;

function sendGalleryMessage(message) {
  if (window.parent !== window) {
    window.parent.postMessage({ ...message, sender: "somewhere-preview" }, window.location.origin);
  }
}

questionSelect.innerHTML = group.issue.questions
  .map((question, index) => `<option value="${question.id}">0${index + 1} · ${question.text}</option>`)
  .join("");

function openComposer() {
  dialog.showModal();
  answerInput.focus();
}

function showView(viewName, questionId = null, broadcast = true) {
  const home = viewName === "home";
  activeView = home ? "home" : "letter";
  document.querySelector("#home-view").hidden = !home;
  document.querySelector("#letter-view").hidden = home;
  document.querySelectorAll(".nav-item[data-nav]").forEach((button) => {
    const active = button.dataset.nav === viewName;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (!broadcast) suppressScrollSync = true;
  if (questionId && !home) {
    requestAnimationFrame(() => {
      document.querySelector(`#question-${CSS.escape(questionId)}`)?.scrollIntoView({
        behavior: broadcast ? "smooth" : "auto",
        block: "start",
      });
    });
  } else {
    window.scrollTo({ top: 0, behavior: broadcast ? "smooth" : "auto" });
  }
  if (broadcast) sendGalleryMessage({ type: "navigation", view: activeView, questionId });
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
document.querySelector("#main-content").addEventListener("click", (event) => {
  const questionControl = event.target.closest("[data-question-id]");
  if (questionControl) showView("letter", questionControl.dataset.questionId);
});
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

window.addEventListener("scroll", () => {
  if (suppressScrollSync) {
    suppressScrollSync = false;
    return;
  }
  if (window.parent === window) return;
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  sendGalleryMessage({
    type: "scroll",
    progress: scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0,
  });
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "sync-request") {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    sendGalleryMessage({
      type: "preview-ready",
      view: activeView,
      progress: scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0,
    });
  } else if (message.type === "sync-navigation" && ["home", "letter"].includes(message.view)) {
    showView(message.view, typeof message.questionId === "string" ? message.questionId : null, false);
  } else if (message.type === "sync-scroll" && Number.isFinite(message.progress)) {
    const progress = Math.max(0, Math.min(1, message.progress));
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const target = progress * scrollableHeight;
    if (Math.abs(target - window.scrollY) > 1) {
      suppressScrollSync = true;
      window.scrollTo({ top: target, behavior: "auto" });
    }
  }
});

renderHome();
renderLetter();
sendGalleryMessage({ type: "preview-ready", view: activeView, progress: 0 });
