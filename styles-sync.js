const previewFrames = [...document.querySelectorAll(".preview-frame iframe")];
const readyFrames = new Set();
let lastNavigation = null;
let lastProgress = null;

function postToPreview(frame, message) {
  if (readyFrames.has(frame.contentWindow)) {
    frame.contentWindow.postMessage(message, window.location.origin);
  }
}

previewFrames.forEach((frame) => {
  frame.addEventListener("load", () => {
    frame.contentWindow.postMessage({ type: "sync-request" }, window.location.origin);
  });
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  const sourceFrame = previewFrames.find((frame) => frame.contentWindow === event.source);
  if (!sourceFrame) return;

  const message = event.data;
  if (!message || typeof message !== "object" || message.sender !== "somewhere-preview") return;

  if (message.type === "preview-ready") {
    readyFrames.add(sourceFrame.contentWindow);
    if (lastNavigation) {
      postToPreview(sourceFrame, {
        type: "sync-navigation",
        view: lastNavigation.view,
        questionId: lastNavigation.questionId,
      });
    }
    if (lastProgress !== null) {
      postToPreview(sourceFrame, { type: "sync-scroll", progress: lastProgress });
    }
    return;
  }

  if (message.type === "navigation" && ["home", "letter"].includes(message.view)) {
    lastNavigation = {
      view: message.view,
      questionId: typeof message.questionId === "string" ? message.questionId : null,
    };
    previewFrames.forEach((frame) => {
      if (frame !== sourceFrame) {
        postToPreview(frame, {
          type: "sync-navigation",
          view: lastNavigation.view,
          questionId: lastNavigation.questionId,
        });
      }
    });
  } else if (message.type === "scroll" && Number.isFinite(message.progress)) {
    lastProgress = Math.max(0, Math.min(1, message.progress));
    previewFrames.forEach((frame) => {
      if (frame !== sourceFrame) {
        postToPreview(frame, { type: "sync-scroll", progress: lastProgress });
      }
    });
  }
});
