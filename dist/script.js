const weddingDate = new Date("2026-12-20T10:30:00+07:00");
const daysLeft = document.querySelector("#daysLeft");
const revealItems = document.querySelectorAll(".reveal-card");
const inviteGate = document.querySelector("#inviteGate");
const openInviteButton = document.querySelector("#openInvite");
const albumItems = document.querySelectorAll(".album__item");
const photoModal = document.querySelector("#photoModal");
const photoModalImage = document.querySelector("#photoModalImage");
const photoModalTitle = document.querySelector("#photoModalTitle");
const photoModalCaption = document.querySelector("#photoModalCaption");
const closePhotoModalButton = document.querySelector("#closePhotoModal");
const qrModal = document.querySelector("#qrModal");
const openQrButtons = document.querySelectorAll("[data-open-qr]");
const closeQrModalButton = document.querySelector("#closeQrModal");
const weddingMusic = document.querySelector("#weddingMusic");
const musicToggle = document.querySelector("#musicToggle");

document.body.classList.add("can-animate");

if (inviteGate && openInviteButton) {
  document.body.classList.add("gate-open");

  openInviteButton.addEventListener("click", () => {
    inviteGate.setAttribute("hidden", "");
    document.body.classList.remove("gate-open");
  });
}

function setMusicState(isPlaying) {
  if (!musicToggle) {
    return;
  }

  musicToggle.classList.toggle("is-playing", isPlaying);
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute(
    "aria-label",
    isPlaying ? "Tạm dừng nhạc nền thiệp cưới" : "Phát nhạc nền thiệp cưới",
  );
}

musicToggle?.addEventListener("click", async () => {
  if (!weddingMusic) {
    return;
  }

  if (weddingMusic.paused) {
    try {
      await weddingMusic.play();
      setMusicState(true);
    } catch {
      setMusicState(false);
    }
    return;
  }

  weddingMusic.pause();
  setMusicState(false);
});

function updateCountdown() {
  const today = new Date();
  const diff = weddingDate.getTime() - today.getTime();
  const days = Math.max(0, Math.ceil(diff / 86400000));
  if (daysLeft) {
    daysLeft.textContent = String(days);
  }
}

updateCountdown();

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.16,
    },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

function openPhotoModal(item) {
  if (
    !photoModal ||
    !photoModalImage ||
    !photoModalTitle ||
    !photoModalCaption
  ) {
    return;
  }

  const image = item.querySelector("img");
  const title = item.dataset.title || "";
  const caption = item.dataset.caption || image?.alt || "";

  photoModalImage.src = image?.currentSrc || image?.src || "";
  photoModalImage.alt = image?.alt || title;
  photoModalTitle.textContent = title;
  photoModalCaption.textContent = caption;
  photoModal.removeAttribute("hidden");
  document.body.classList.add("modal-open");
  closePhotoModalButton?.focus();
}

function closePhotoModal() {
  if (!photoModal) {
    return;
  }

  photoModal.setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
}

function openQrModal() {
  if (!qrModal) {
    return;
  }

  qrModal.removeAttribute("hidden");
  document.body.classList.add("qr-open");
  closeQrModalButton?.focus();
}

function closeQrModal() {
  if (!qrModal) {
    return;
  }

  qrModal.setAttribute("hidden", "");
  document.body.classList.remove("qr-open");
}

albumItems.forEach((item) => {
  item.addEventListener("click", () => openPhotoModal(item));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPhotoModal(item);
    }
  });
});

closePhotoModalButton?.addEventListener("click", closePhotoModal);
closeQrModalButton?.addEventListener("click", closeQrModal);

openQrButtons.forEach((button) => {
  button.addEventListener("click", openQrModal);
});

photoModal?.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModal();
  }
});

qrModal?.addEventListener("click", (event) => {
  if (event.target === qrModal) {
    closeQrModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePhotoModal();
    closeQrModal();
  }
});
