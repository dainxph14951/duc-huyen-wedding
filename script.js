const weddingDate = new Date("2026-12-20T10:30:00+07:00");
const daysLeft = document.querySelector("#daysLeft");
const inviteGate = document.querySelector("#inviteGate");
const openInviteButton = document.querySelector("#openInvite");
const albumItems = Array.from(document.querySelectorAll(".album__item"));
const photoModal = document.querySelector("#photoModal");
const photoModalImage = document.querySelector("#photoModalImage");
const photoModalTitle = document.querySelector("#photoModalTitle");
const photoModalCount = document.querySelector("#photoModalCount");
const closePhotoModalButton = document.querySelector("#closePhotoModal");
const prevPhotoButton = document.querySelector("#prevPhoto");
const nextPhotoButton = document.querySelector("#nextPhoto");
const qrModal = document.querySelector("#qrModal");
const openQrButtons = document.querySelectorAll("[data-open-qr]");
const closeQrModalButton = document.querySelector("#closeQrModal");
const weddingMusic = document.querySelector("#weddingMusic");
const musicToggle = document.querySelector("#musicToggle");

document.body.classList.add("can-animate");

/* ---------- Cổng mở thiệp ---------- */
if (inviteGate && openInviteButton) {
  document.body.classList.add("gate-open");

  openInviteButton.addEventListener("click", async () => {
    inviteGate.setAttribute("hidden", "");
    document.body.classList.remove("gate-open");

    // Bấm "Mở thiệp" là thao tác của người dùng nên trình duyệt cho phép phát nhạc
    if (weddingMusic) {
      try {
        await weddingMusic.play();
        setMusicState(true);
      } catch {
        setMusicState(false);
      }
    }
  });
}

/* ---------- Nhạc nền ---------- */
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

/* ---------- Đếm ngược (ngày, giờ, phút, giây) ---------- */
const countdownParts = {
  days: daysLeft,
  hours: document.querySelector("#hoursLeft"),
  minutes: document.querySelector("#minutesLeft"),
  seconds: document.querySelector("#secondsLeft"),
};

function updateCountdown() {
  const diff = Math.max(0, weddingDate.getTime() - Date.now());
  const values = {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };

  Object.entries(countdownParts).forEach(([key, element]) => {
    if (element) {
      const value = values[key];
      element.textContent =
        key === "days" ? String(value) : String(value).padStart(2, "0");
    }
  });
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ---------- Animation xuất hiện ---------- */
// Container có data-stagger: các khối con lần lượt hiện ra, mỗi khối trễ 90ms
document.querySelectorAll("[data-stagger]").forEach((group) => {
  const base = Number(group.dataset.staggerBase || 0);
  const kind = group.dataset.staggerAnim || "up";

  Array.from(group.children).forEach((child, index) => {
    child.dataset.anim = kind;
    child.style.setProperty("--delay", `${base + index * 90}ms`);
  });
});

const revealItems = document.querySelectorAll("[data-anim]");

function showItem(item) {
  item.classList.add("is-visible");
  // Bỏ độ trễ sau khi hiện xong để hiệu ứng hover không bị chậm
  setTimeout(() => item.style.removeProperty("--delay"), 2200);
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        showItem(entry.target);
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.1,
    },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach(showItem);
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealItems.forEach(showItem);
}

/* ---------- Xem ảnh album ---------- */
let currentPhoto = 0;
let lastFocusedItem = null;

function showPhoto(index) {
  if (!photoModalImage || !photoModalTitle || albumItems.length === 0) {
    return;
  }

  currentPhoto = (index + albumItems.length) % albumItems.length;

  const item = albumItems[currentPhoto];
  const image = item.querySelector("img");
  const title = item.dataset.title || image?.alt || "";

  photoModalImage.src = image?.currentSrc || image?.src || "";
  photoModalImage.alt = image?.alt || title;
  photoModalTitle.textContent = title;

  if (photoModalCount) {
    photoModalCount.textContent = `${currentPhoto + 1} / ${albumItems.length}`;
  }
}

function openPhotoModal(index) {
  if (!photoModal) {
    return;
  }

  lastFocusedItem = albumItems[index] || null;
  showPhoto(index);
  photoModal.removeAttribute("hidden");
  document.body.classList.add("modal-open");
  closePhotoModalButton?.focus();
}

function closePhotoModal() {
  if (!photoModal || photoModal.hasAttribute("hidden")) {
    return;
  }

  photoModal.setAttribute("hidden", "");
  document.body.classList.remove("modal-open");
  lastFocusedItem?.focus();
}

albumItems.forEach((item, index) => {
  item.addEventListener("click", () => openPhotoModal(index));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPhotoModal(index);
    }
  });
});

prevPhotoButton?.addEventListener("click", () => showPhoto(currentPhoto - 1));
nextPhotoButton?.addEventListener("click", () => showPhoto(currentPhoto + 1));
closePhotoModalButton?.addEventListener("click", closePhotoModal);

photoModal?.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModal();
  }
});

/* ---------- QR mừng cưới ---------- */
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

openQrButtons.forEach((button) => {
  button.addEventListener("click", openQrModal);
});

closeQrModalButton?.addEventListener("click", closeQrModal);

qrModal?.addEventListener("click", (event) => {
  if (event.target === qrModal) {
    closeQrModal();
  }
});

/* ---------- Bàn phím ---------- */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePhotoModal();
    closeQrModal();
    return;
  }

  if (photoModal && !photoModal.hasAttribute("hidden")) {
    if (event.key === "ArrowLeft") {
      showPhoto(currentPhoto - 1);
    } else if (event.key === "ArrowRight") {
      showPhoto(currentPhoto + 1);
    }
  }
});
