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
      startInvitationReveals();
      startInvitationScroll();
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

/* ---------- Tự cuộn sau khi mở thiệp ---------- */
function startInvitationScroll() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionQuery.matches) return;

  const speed = 32; // Pixel mỗi giây, giữ nhịp chậm để khách đọc thiệp.
  const controls = new AbortController();
  let frame = 0;
  let previousTime;
  let position = window.scrollY;
  let startsAt = performance.now() + 2000;

  function stop() {
    cancelAnimationFrame(frame);
    controls.abort();
  }

  function scroll(timestamp) {
    // Không cuộn nền khi xem ảnh, QR hoặc chuyển sang tab khác.
    const paused = document.hidden
      || document.body.classList.contains("modal-open")
      || document.body.classList.contains("qr-open");
    if (paused || timestamp < startsAt) {
      previousTime = undefined;
      position = window.scrollY;
    } else {
      const elapsed = previousTime === undefined ? 0 : Math.min(timestamp - previousTime, 64);
      const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      position = Math.min(bottom, position + speed * elapsed / 1000);
      // Ghi đè smooth scroll CSS để từng khung hình tiến đều, không bị trễ.
      window.scrollTo({ top: position, behavior: "instant" });
      previousTime = timestamp;
      if (position >= bottom) {
        stop();
        return;
      }
    }
    frame = requestAnimationFrame(scroll);
  }

  const options = { passive: true, signal: controls.signal };
  window.addEventListener("wheel", stop, options);
  window.addEventListener("touchmove", stop, options);
  window.addEventListener("pointerdown", (event) => {
    // Bao gồm kéo thanh cuộn trên máy tính.
    if (event.target === document.documentElement) stop();
  }, options);
  document.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Tab", "Escape"].includes(event.key)) stop();
  }, { signal: controls.signal });
  document.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) stop();
  }, { signal: controls.signal });
  motionQuery.addEventListener("change", () => {
    if (motionQuery.matches) stop();
  }, { signal: controls.signal });
  document.addEventListener("visibilitychange", () => {
    previousTime = undefined;
    position = window.scrollY;
  }, { signal: controls.signal });
  frame = requestAnimationFrame(scroll);
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

// Tách theo từ để giữ nguyên dấu tiếng Việt và cách xuống dòng tự nhiên.
const textMotionTargets = document.querySelectorAll(
  "main h2, main h3, .couple__person strong, .love-story__eyebrow, .love-story__chapters p, .album__intro p, .footer p, .footer > span"
);
textMotionTargets.forEach((element) => {
  if (element.children.length) return;
  element.dataset.textMotion = element.matches("p, .footer > span") ? "soft" : "title";
  const fragment = document.createDocumentFragment();
  let wordIndex = 0;
  element.textContent.split(/(\s+)/).forEach((part) => {
    if (!part.trim()) {
      fragment.append(document.createTextNode(part));
      return;
    }
    const word = document.createElement("span");
    word.className = "text-word";
    word.textContent = part;
    word.style.setProperty("--word-delay", `${Math.min(wordIndex++ * 85, 510)}ms`);
    fragment.append(word);
  });
  element.replaceChildren(fragment);
});

const revealItems = document.querySelectorAll("[data-anim], [data-text-motion]");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function showItem(item) {
  item.classList.add("is-visible");
}

let invitationRevealsStarted = false;
function startInvitationReveals() {
  if (invitationRevealsStarted) return;
  invitationRevealsStarted = true;

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
        // Cuộn chậm: chờ nội dung vào màn hình để khách thấy trọn hiệu ứng.
        rootMargin: "0px 0px -40px 0px",
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
}

// Cổng mở thiệp che nội dung, nên chưa chạy hiệu ứng phía sau.
if (!document.body.classList.contains("gate-open")) startInvitationReveals();

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
    // Thumbnail tải bản nhỏ riêng, không kế thừa srcset của ảnh album.
    const sourceImage = item.querySelector("img");
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.src = sourceImage.dataset.thumbSrc || sourceImage.currentSrc || sourceImage.src;
    button.append(image);
    button.addEventListener("click", () => goToAlbumPhoto(index));
    albumThumbs.append(button);
    return button;
  });

  const albumSection = albumTrack.closest(".album");
  const autoplayButton = document.querySelector("#albumAutoplay");
  const albumTransitionDuration = 1200;
  const albumAutoplayDelay = 2000;
  let albumAnimationFrame = 0;
  let autoplayTimer;
  let scrollSettleTimer;
  let isPaused = reduceMotionQuery.matches;
  let isAlbumVisible = !("IntersectionObserver" in window);

  function scheduleAutoplay() {
    clearTimeout(autoplayTimer);
    if (albumAnimationFrame || isPaused || !isAlbumVisible || document.hidden) return;
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
  autoplayButton.addEventListener("click", () => {
    isPaused = !isPaused;
    updateAutoplayButton();
    scheduleAutoplay();
  });
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

  photoModalImage.decoding = "async";
  photoModalImage.src = image?.dataset.fullSrc || image?.currentSrc || image?.src || "";
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

/* ---------- Mục đang xem trên thanh điều hướng di động ---------- */
const mobileSectionLinks = Array.from(document.querySelectorAll('.mobile-actions a[href^="#"]'));
const mobileSections = mobileSectionLinks.map((link) => ({
  link,
  section: document.querySelector(link.getAttribute("href")),
})).filter(({ section }) => section);
let mobileNavigationFrame = 0;
function updateMobileNavigation() {
  const marker = window.innerHeight * 0.45;
  mobileSections.forEach(({ link, section }) => {
    const bounds = section.getBoundingClientRect();
    if (bounds.top <= marker && bounds.bottom > marker) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  mobileNavigationFrame = 0;
}
function scheduleMobileNavigation() {
  if (!mobileNavigationFrame) mobileNavigationFrame = requestAnimationFrame(updateMobileNavigation);
}
window.addEventListener("scroll", scheduleMobileNavigation, { passive: true });
window.addEventListener("resize", scheduleMobileNavigation);
updateMobileNavigation();

/* Chỉ chạy ánh sao khi phần hành trình nằm trong màn hình. */
const sparklingStory = document.querySelector(".love-story");
if (sparklingStory && "IntersectionObserver" in window) {
  const storySparkleObserver = new IntersectionObserver(([entry]) => {
    sparklingStory.classList.toggle("is-sparkling", entry.isIntersecting);
  }, { threshold: 0 });
  storySparkleObserver.observe(sparklingStory);
}

/* Du thuyền và sóng chỉ chuyển động khi album ở trong màn hình. */
const sailingAlbum = document.querySelector(".album");
if (sailingAlbum) {
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      sailingAlbum.classList.toggle("is-sailing", entry.isIntersecting);
    }, { threshold: 0 }).observe(sailingAlbum);
  } else {
    sailingAlbum.classList.add("is-sailing");
  }
}

/* Khói bếp chỉ bay khi ngôi nhà xuất hiện trong màn hình. */
const coupleHomeSection = document.querySelector(".couple");
if (coupleHomeSection) {
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      coupleHomeSection.classList.toggle("is-home-visible", entry.isIntersecting);
    }, { threshold: 0 }).observe(coupleHomeSection);
  } else {
    coupleHomeSection.classList.add("is-home-visible");
  }
}

/* Hai vòi pháo sáng ở chân ảnh, chỉ chạy khi ảnh đang trong màn hình. */
const fireworksPhoto = document.querySelector(".feature__photo");
const fireworksLayer = fireworksPhoto?.querySelector(".feature-fireworks");
if (fireworksLayer) {
  ["left", "right"].forEach((side) => {
    const fountain = document.createElement("span");
    fountain.className = `feature-fireworks__fountain feature-fireworks__fountain--${side}`;
    for (let index = 0; index < 42; index++) {
      const spark = document.createElement("i");
      spark.className = "feature-fireworks__spark";
      spark.style.setProperty("--drift", `${((index * 17) % 131) - 65}px`);
      spark.style.setProperty("--lift", String(0.65 + ((index * 13) % 36) / 100));
      spark.style.setProperty("--duration", `${1.25 + ((index * 7) % 85) / 100}s`);
      spark.style.setProperty("--spark-delay", `${-index * 0.137 - (side === "right" ? 0.6 : 0)}s`);
      fountain.append(spark);
    }
    fireworksLayer.append(fountain);
  });

  let fireworksVisible = !("IntersectionObserver" in window);
  function updateFireworks() {
    fireworksPhoto.classList.toggle("is-firing", fireworksVisible && !document.hidden && !reduceMotionQuery.matches);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      fireworksVisible = entry.isIntersecting;
      updateFireworks();
    }, { threshold: 0.15 }).observe(fireworksPhoto);
  }
  document.addEventListener("visibilitychange", updateFireworks);
  reduceMotionQuery.addEventListener("change", updateFireworks);
  updateFireworks();
}

/* Một nhịp chung để em bé tới cửa trước khi cửa mở và bóng bay xuất hiện. */
const visitor = document.querySelector(".home-visitor");
const storyEntrance = document.querySelector(".story-entrance");
const visitorRoad = storyEntrance?.querySelector(".story-entrance__road");
const visitorPath = visitorRoad?.querySelector("path");
const homeDoor = document.querySelector(".couple-home__door-leaf");
const homeBalloon = document.querySelector(".couple-home__balloon");
if (visitor && visitorPath && homeDoor && homeBalloon && coupleHomeSection) {
  const pathLength = visitorPath.getTotalLength();
  const seen = new Set();
  let frame = 0;
  let previousTime;
  let elapsed = 0;
  let roadWidth = 0;
  let roadHeight = 0;
  let roadLeft = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ease = (value) => value * value * (3 - 2 * value);

  function measureVisitorRoad() {
    const bounds = visitorRoad.getBoundingClientRect();
    roadWidth = bounds.width;
    roadHeight = bounds.height;
    roadLeft = (storyEntrance.clientWidth - roadWidth) / 2;
  }
  function paintVisitor() {
    const phase = (elapsed % 20000) / 20000;
    const walk = clamp(phase / 0.58);
    const point = visitorPath.getPointAtLength(pathLength * (1 - walk));
    const enter = ease(clamp((phase - 0.73) / 0.08));
    visitor.style.left = `${roadLeft + point.x / 520 * roadWidth}px`;
    visitor.style.top = `${point.y / 520 * roadHeight - enter * 22}px`;
    visitor.style.opacity = String(Math.min(clamp(phase / 0.025), 1 - enter));
    visitor.style.transform = `translate(-50%, -100%) scale(${1 - enter * 0.35})`;
    visitor.classList.toggle("is-walking", phase < 0.58 || (phase > 0.73 && phase < 0.81));
    visitor.classList.toggle("is-reaching", phase >= 0.58 && phase < 0.73);

    const open = ease(clamp((phase - 0.61) / 0.09)) * (1 - ease(clamp((phase - 0.9) / 0.07)));
    homeDoor.style.transform = `rotateY(${-105 * open}deg)`;
    const balloon = ease(clamp((phase - 0.7) / 0.08)) * (1 - ease(clamp((phase - 0.83) / 0.06)));
    homeBalloon.style.opacity = String(balloon);
    homeBalloon.style.transform = `translateY(${32 * (1 - balloon)}px) scale(${0.65 + balloon * 0.35})`;
  }
  function tick(timestamp) {
    frame = 0;
    if (previousTime !== undefined) elapsed += Math.min(timestamp - previousTime, 64);
    previousTime = timestamp;
    paintVisitor();
    frame = requestAnimationFrame(tick);
  }
  function updateVisitorPlayback() {
    const reduced = reduceMotionQuery.matches;
    coupleHomeSection.classList.toggle("has-home-visitor", !reduced);
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = undefined;
    if (reduced) {
      homeDoor.style.removeProperty("transform");
      homeBalloon.style.removeProperty("transform");
      homeBalloon.style.removeProperty("opacity");
      return;
    }
    if (document.hidden || document.body.classList.contains("gate-open") || !seen.size) return;
    measureVisitorRoad();
    paintVisitor();
    frame = requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) seen.add(target);
        else seen.delete(target);
      });
      updateVisitorPlayback();
    }).observe(coupleHomeSection);
    // Observe the entire route, including the gate, with the same playback state.
    const routeObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) seen.add(storyEntrance);
      else seen.delete(storyEntrance);
      updateVisitorPlayback();
    });
    routeObserver.observe(storyEntrance);
  } else {
    seen.add(storyEntrance);
  }
  if ("ResizeObserver" in window) new ResizeObserver(measureVisitorRoad).observe(storyEntrance);
  else window.addEventListener("resize", measureVisitorRoad);
  new MutationObserver(updateVisitorPlayback).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", updateVisitorPlayback);
  reduceMotionQuery.addEventListener("change", updateVisitorPlayback);
  updateVisitorPlayback();
}

/* Cánh chim lướt qua bình minh khi phần núi đồi đang hiển thị. */
const dawnFooter = document.querySelector(".footer");
if (dawnFooter) {
  let dawnVisible = !("IntersectionObserver" in window);
  const updateDawnBirds = () => dawnFooter.classList.toggle("is-birds-visible", dawnVisible && !document.hidden && !reduceMotionQuery.matches);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      dawnVisible = entry.isIntersecting;
      updateDawnBirds();
    }).observe(dawnFooter);
  }
  document.addEventListener("visibilitychange", updateDawnBirds);
  reduceMotionQuery.addEventListener("change", updateDawnBirds);
  updateDawnBirds();
}

/* Độ nghiêng 3D độc lập với transform của reveal, du thuyền và pháo sáng. */
const depthPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const depthCards = document.querySelectorAll(".invite-gate__card, .event__panel, .story-gate, .feature__photo");
const resetDepthCards = [];
depthCards.forEach((card) => {
  card.classList.add("depth-card");
  const glint = document.createElement("span");
  glint.className = "depth-card__glint";
  glint.setAttribute("aria-hidden", "true");
  card.append(glint);
  let frame = 0;
  let bounds;
  let pointerX = 0;
  let pointerY = 0;

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    bounds = undefined;
    card.classList.remove("depth-card--active");
    ["--depth-axis-x", "--depth-axis-y", "--depth-angle", "--depth-light-x", "--depth-light-y"].forEach((name) => card.style.removeProperty(name));
  }
  function paint() {
    frame = 0;
    if (!bounds?.width || !bounds.height) return;
    const x = Math.max(-1, Math.min(1, (pointerX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (pointerY - bounds.top) / bounds.height * 2 - 1));
    const distance = Math.hypot(x, y);
    card.style.setProperty("--depth-axis-x", String(distance ? -y / distance : 0));
    card.style.setProperty("--depth-axis-y", String(distance ? x / distance : 1));
    card.style.setProperty("--depth-angle", `${Math.min(distance, 1) * 4}deg`);
    card.style.setProperty("--depth-light-x", `${(x + 1) * 50}%`);
    card.style.setProperty("--depth-light-y", `${(y + 1) * 50}%`);
    card.classList.add("depth-card--active");
  }
  card.addEventListener("pointermove", (event) => {
    if (!depthPointer.matches || reduceMotionQuery.matches || event.pointerType === "touch") return;
    if (!bounds) bounds = card.getBoundingClientRect();
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  card.addEventListener("pointerleave", reset);
  card.addEventListener("pointercancel", reset);
  card.addEventListener("click", reset);
  resetDepthCards.push(reset);
});
const resetAllDepth = () => resetDepthCards.forEach((reset) => reset());
window.addEventListener("scroll", resetAllDepth, { passive: true });
window.addEventListener("resize", resetAllDepth);
document.addEventListener("visibilitychange", resetAllDepth);
depthPointer.addEventListener("change", resetAllDepth);
reduceMotionQuery.addEventListener("change", resetAllDepth);
