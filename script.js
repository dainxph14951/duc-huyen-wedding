const weddingDate = new Date("2027-01-17T16:10:00+07:00");
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
    if (openInviteButton.disabled) return;
    openInviteButton.disabled = true;
    // Bắt đầu nhạc ngay trong thao tác bấm; hiệu ứng mở thiệp chạy song song.
    const opening = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      && typeof inviteGate.animate === "function"
      ? Promise.all([
          inviteGate.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 1050, easing: "ease-in-out", fill: "forwards",
          }).finished,
          inviteGate.querySelector(".invite-gate__card").animate(
            [{ transform: "perspective(1200px) rotateY(0deg) scale(1)" },
             { transform: "perspective(1200px) rotateY(-12deg) scale(1.06)" }],
            { duration: 1050, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
          ).finished,
        ]).catch(() => {})
      : Promise.resolve();
    opening.then(() => {
      inviteGate.setAttribute("hidden", "");
      document.body.classList.remove("gate-open");
      document.querySelector('.hero__actions a')?.focus({ preventScroll: true });
    });

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
// Hiện khi vào màn hình; chỉ đặt lại sau khi ra xa mép để tránh bật tắt liên tục.
document.querySelectorAll("[data-stagger]").forEach((group) => {
  const base = Math.min(Number(group.dataset.staggerBase || 0), 100);
  const kind = group.classList.contains("love-story__chapters")
    ? "unfold"
    : group.classList.contains("album__grid")
      ? "photo"
      : group.dataset.staggerAnim || "up";

  Array.from(group.children).forEach((child, index) => {
    child.dataset.anim = kind;
    child.style.setProperty("--delay", `${Math.min(base + index * 90, 420)}ms`);
  });
});

const revealItems = document.querySelectorAll("[data-anim]");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function showItem(item) {
  item.classList.add("is-visible");
}

if ("IntersectionObserver" in window && !reduceMotionQuery.matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        showItem(entry.target);
      });
    },
    {
      rootMargin: "0px 0px 60px 0px",
      threshold: 0.01,
    },
  );

  // Vùng đặt lại rộng hơn vùng xuất hiện, tránh transform của chính khối
  // làm nó liên tục đi qua ngưỡng quan sát khi người dùng cuộn chậm.
  const resetObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          entry.target.classList.remove("is-visible");
        }
      });
    },
    {
      rootMargin: "140px 0px 140px 0px",
      threshold: 0,
    },
  );

  revealItems.forEach((item) => {
    revealObserver.observe(item);
    resetObserver.observe(item);
  });
} else {
  revealItems.forEach(showItem);
}

/* ---------- Album trượt ngang ---------- */
const albumTrack = document.querySelector("#albumTrack");
const albumThumbs = document.querySelector("#albumThumbs");
const albumPrev = document.querySelector("#albumPrev");
const albumNext = document.querySelector("#albumNext");
const albumCount = document.querySelector("#albumCount");
let activeAlbumPhoto = 0;

if (albumTrack && albumThumbs && albumItems.length) {
  const thumbs = albumItems.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "album__thumb";
    button.setAttribute("aria-label", `Xem ảnh ${index + 1}: ${item.dataset.title}`);
    button.setAttribute("aria-controls", "albumTrack");
    const image = item.querySelector("img").cloneNode();
    image.alt = "";
    button.append(image);
    button.addEventListener("click", () => goToAlbumPhoto(index));
    albumThumbs.append(button);
    return button;
  });

  const albumSection = albumTrack.closest(".album");
  const autoplayButton = document.querySelector("#albumAutoplay");
  const albumTransitionDuration = 1200;
  const albumAutoplayDelay = 4000;
  let albumAnimationFrame = 0;
  let autoplayTimer;
  let scrollSettleTimer;
  let isPaused = reduceMotionQuery.matches;
  let isInteracting = false;
  let isHovered = false;
  let isAlbumVisible = !("IntersectionObserver" in window);

  function scheduleAutoplay() {
    clearTimeout(autoplayTimer);
    if (albumAnimationFrame || isPaused || isInteracting || isHovered || !isAlbumVisible || document.hidden || albumSection.contains(document.activeElement)) return;
    autoplayTimer = setTimeout(() => {
      if (document.body.classList.contains("modal-open") || document.body.classList.contains("gate-open") || document.body.classList.contains("qr-open")) {
        scheduleAutoplay();
        return;
      }
      const next = (activeAlbumPhoto + 1) % albumItems.length;
      // Quay về đầu ngay, tránh chạy ngược qua cả dải ảnh.
      goToAlbumPhoto(next, next === 0);
      scheduleAutoplay();
    }, albumAutoplayDelay);
  }

  function updateAutoplayButton() {
    autoplayButton.setAttribute("aria-pressed", String(isPaused));
    autoplayButton.textContent = isPaused ? "Bật tự chuyển ảnh" : "Tạm dừng tự chuyển";
    albumCount.setAttribute("aria-live", isPaused ? "polite" : "off");
  }

  function paintAlbumTransition() {
    const step = albumItems.length > 1 ? albumItems[1].offsetLeft - albumItems[0].offsetLeft : 1;
    const progress = albumTrack.scrollLeft / step;
    albumItems.forEach((item, index) => {
      const distance = Math.max(-1, Math.min(1, index - progress));
      const amount = Math.abs(distance);
      item.style.setProperty("--album-shift", `${distance * 18}px`);
      item.style.setProperty("--album-turn", `${distance * -9}deg`);
      item.style.setProperty("--album-scale", String(1 - amount * 0.08));
      item.style.setProperty("--album-opacity", String(1 - amount * 0.5));
      item.style.setProperty("--album-caption-shift", `${amount * 10}px`);
    });
    updateAlbumState(Math.max(0, Math.min(albumItems.length - 1, Math.round(progress))));
  }

  function updateAlbumState(index) {
    activeAlbumPhoto = index;
    thumbs.forEach((thumb, i) => thumb.setAttribute("aria-current", String(i === index)));
    // Các ảnh ngoài khung vẫn mở được qua nút chọn, không nhận Tab ngoài màn hình.
    albumItems.forEach((item, i) => {
      item.tabIndex = i === index ? 0 : -1;
      if (i === index) item.removeAttribute("aria-hidden");
      else item.setAttribute("aria-hidden", "true");
    });
    albumCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(albumItems.length).padStart(2, "0")}`;
    albumPrev.disabled = index === 0;
    albumNext.disabled = index === albumItems.length - 1;
  }

  function cancelAlbumTransition() {
    cancelAnimationFrame(albumAnimationFrame);
    albumAnimationFrame = 0;
    albumTrack.style.removeProperty("scroll-snap-type");
  }

  function goToAlbumPhoto(index, instant = false) {
    cancelAlbumTransition();
    const target = Math.max(0, Math.min(index, albumItems.length - 1));
    const destination = albumItems[target].offsetLeft - albumItems[0].offsetLeft;
    const startLeft = albumTrack.scrollLeft;
    clearTimeout(autoplayTimer);
    if (instant || reduceMotionQuery.matches || Math.abs(destination - startLeft) < 1) {
      albumTrack.scrollTo({ left: destination, behavior: "instant" });
      if (instant && !reduceMotionQuery.matches && target !== activeAlbumPhoto) {
        albumItems[target].querySelector("img").animate?.([
          { opacity: 0.4, transform: "scale(0.94) rotateY(-7deg)" },
          { opacity: 1, transform: "scale(1) rotateY(0deg)" },
        ], { duration: albumTransitionDuration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
      }
      paintAlbumTransition();
      scheduleAutoplay();
      return;
    }

    // Tự điều khiển thời lượng vì smooth scroll của trình duyệt thường quá nhanh.
    albumTrack.style.setProperty("scroll-snap-type", "none");
    let startedAt;
    function animateAlbum(timestamp) {
      if (startedAt === undefined) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / albumTransitionDuration, 1);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      albumTrack.scrollTo({ left: startLeft + (destination - startLeft) * eased, behavior: "instant" });
      paintAlbumTransition();
      if (progress < 1) {
        albumAnimationFrame = requestAnimationFrame(animateAlbum);
      } else {
        cancelAlbumTransition();
        scheduleAutoplay();
      }
    }
    albumAnimationFrame = requestAnimationFrame(animateAlbum);
  }

  let albumScrollFrame = 0;
  albumTrack.addEventListener("scroll", () => {
    clearTimeout(autoplayTimer);
    clearTimeout(scrollSettleTimer);
    scrollSettleTimer = setTimeout(scheduleAutoplay, 160);
    if (albumScrollFrame) return;
    albumScrollFrame = requestAnimationFrame(() => {
      paintAlbumTransition();
      albumScrollFrame = 0;
    });
  }, { passive: true });
  albumPrev.addEventListener("click", () => goToAlbumPhoto(activeAlbumPhoto - 1));
  albumNext.addEventListener("click", () => goToAlbumPhoto(activeAlbumPhoto + 1));
  albumTrack.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      goToAlbumPhoto(activeAlbumPhoto + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  autoplayButton.addEventListener("click", () => {
    isPaused = !isPaused;
    updateAutoplayButton();
    scheduleAutoplay();
  });
  albumSection.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;
    isHovered = true;
    scheduleAutoplay();
  });
  albumSection.addEventListener("pointerleave", () => {
    isHovered = false;
    scheduleAutoplay();
  });
  albumTrack.addEventListener("wheel", cancelAlbumTransition, { passive: true });
  albumTrack.addEventListener("pointerdown", () => {
    cancelAlbumTransition();
    isInteracting = true;
    scheduleAutoplay();
  }, { passive: true });
  const endInteraction = () => {
    if (!isInteracting) return;
    isInteracting = false;
    scheduleAutoplay();
  };
  window.addEventListener("pointerup", endInteraction);
  window.addEventListener("pointercancel", endInteraction);
  albumSection.addEventListener("focusin", scheduleAutoplay);
  albumSection.addEventListener("focusout", () => setTimeout(scheduleAutoplay, 0));
  document.addEventListener("visibilitychange", scheduleAutoplay);
  reduceMotionQuery.addEventListener("change", () => {
    if (reduceMotionQuery.matches) isPaused = true;
    updateAutoplayButton();
    paintAlbumTransition();
    scheduleAutoplay();
  });
  window.addEventListener("resize", () => {
    goToAlbumPhoto(activeAlbumPhoto, true);
    paintAlbumTransition();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      isAlbumVisible = entry.isIntersecting;
      scheduleAutoplay();
    }, { threshold: 0.25 }).observe(albumTrack);
  }
  updateAutoplayButton();
  paintAlbumTransition();
  scheduleAutoplay();
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
