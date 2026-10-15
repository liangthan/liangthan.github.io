// Liang95 window manager.
const desktop = document.getElementById('desktop');
const tasks = document.getElementById('tasks');
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');
const mobile = matchMedia('(max-width: 640px)');
let z = 10;
let cascade = 0;
let lastPointer = 'mouse';
addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, true);

const win = id => document.getElementById('win-' + id);

function focusWin(w) {
    document.querySelectorAll('.window.active').forEach(x => x.classList.remove('active'));
    w.classList.add('active');
    w.style.zIndex = ++z;
    tasks.querySelectorAll('.btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.win === w.id));
}

function place(w) {
    if (w.dataset.placed || mobile.matches) return;
    const r = desktop.getBoundingClientRect();
    const width = Math.min(w.offsetWidth, r.width - 16);
    const height = Math.min(w.offsetHeight, r.height - 16);
    const off = (cascade++ % 6) * 24;
    w.style.left = Math.max(8, Math.min(r.width - width - 8, (r.width - width) / 2 + off - 40)) + 'px';
    w.style.top = Math.max(8, Math.min(r.height - height - 8, (r.height - height) / 2 + off - 40)) + 'px';
    w.dataset.placed = 1;
}

function open(id) {
    const w = win(id);
    if (!w) return;
    closeStart();
    if (!w.classList.contains('open')) {
        w.classList.add('open', 'opening');
        setTimeout(() => w.classList.remove('opening'), 200);
        place(w);
        addTask(w);
    }
    w.classList.remove('min');
    focusWin(w);
    focusInside(w);
}

function focusInside(w) {
    (w.querySelector('.win-body [tabindex], .win-body button, .win-body a') || w.querySelector('.ctl-close')).focus({ preventScroll: true });
}

// Keep windows reachable after the viewport changes.
function clampAll() {
    if (mobile.matches) return;
    const r = desktop.getBoundingClientRect();
    document.querySelectorAll('.window.open').forEach(w => {
        if (!w.dataset.placed) return place(w);
        w.style.left = Math.max(40 - w.offsetWidth, Math.min(r.width - 40, w.offsetLeft)) + 'px';
        w.style.top = Math.max(0, Math.min(r.height - 18, w.offsetTop)) + 'px';
    });
}
addEventListener('resize', clampAll);

function topWindow() {
    return [...document.querySelectorAll('.window.open:not(.min)')].sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
}

function focusNext() {
    const next = topWindow();
    if (next) { focusWin(next); focusInside(next); } else startBtn.focus();
}

function close(w) {
    w.classList.remove('open', 'active', 'max', 'min');
    if (w.id === 'win-viewer') document.getElementById('viewer-stage').replaceChildren(); // stop video audio
    tasks.querySelector(`[data-win="${w.id}"]`)?.remove();
    focusNext();
}

function minimize(w) {
    w.classList.add('min');
    w.classList.remove('active');
    tasks.querySelector(`[data-win="${w.id}"]`)?.setAttribute('aria-pressed', 'false');
    focusNext();
}

function addTask(w) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.type = 'button';
    b.dataset.win = w.id;
    const svg = w.querySelector('.titlebar svg')?.cloneNode(true);
    if (svg) b.append(svg);
    const label = document.createElement('span');
    label.textContent = w.dataset.title;
    b.append(label);
    b.addEventListener('click', () => {
        if (w.classList.contains('active') && !w.classList.contains('min')) minimize(w);
        else { w.classList.remove('min'); focusWin(w); }
    });
    tasks.append(b);
}

// Icons: double-click or Enter with a mouse, single tap on touch.
const deselect = () => document.querySelectorAll('.icon.selected').forEach(x => x.classList.remove('selected'));
document.querySelectorAll('.icon').forEach(icon => {
    icon.addEventListener('click', e => {
        deselect();
        icon.classList.add('selected');
        if (e.detail === 0 || lastPointer === 'touch' || mobile.matches) open(icon.dataset.open);
    });
    icon.addEventListener('dblclick', () => open(icon.dataset.open));
});
desktop.addEventListener('pointerdown', e => { if (e.target === desktop) deselect(); });

document.addEventListener('click', e => {
    const opener = e.target.closest('[data-open]:not(.icon)');
    if (opener) return open(opener.dataset.open);
    const w = e.target.closest('.window');
    if (!w) return;
    if (e.target.closest('.ctl-close, [data-close]')) close(w);
    else if (e.target.closest('.ctl-min')) minimize(w);
    else if (e.target.closest('.ctl-max')) { focusWin(w); w.classList.toggle('max'); }
});

// Focus + drag.
document.querySelectorAll('.window').forEach(w => {
    w.addEventListener('pointerdown', e => { if (!e.target.closest('.ctl')) focusWin(w); });
    const bar = w.querySelector('.titlebar');
    bar.addEventListener('dblclick', e => {
        if (!e.target.closest('.ctl') && w.querySelector('.ctl-max')) w.classList.toggle('max');
    });
    bar.addEventListener('pointerdown', e => {
        if (e.target.closest('.ctl') || w.classList.contains('max') || mobile.matches || e.button !== 0) return;
        const r = desktop.getBoundingClientRect();
        const dx = e.clientX - w.offsetLeft, dy = e.clientY - w.offsetTop;
        bar.setPointerCapture(e.pointerId);
        const move = ev => {
            w.style.left = Math.min(r.width - 40, Math.max(40 - w.offsetWidth, ev.clientX - dx)) + 'px';
            w.style.top = Math.min(r.height - 18, Math.max(0, ev.clientY - dy)) + 'px';
        };
        const end = () => {
            bar.removeEventListener('pointermove', move);
            bar.removeEventListener('pointerup', end);
            bar.removeEventListener('pointercancel', end);
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', end);
        bar.addEventListener('pointercancel', end);
    });
});

// Tabs.
document.querySelectorAll('[role="tablist"]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = t => tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', on);
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(t));
        t.addEventListener('keydown', e => {
            const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!d) return;
            const n = tabs[(i + d + tabs.length) % tabs.length];
            select(n);
            n.focus();
        });
    });
});

// Photo viewer: Back/Next step through the gallery the photo was opened from.
const stage = document.getElementById('viewer-stage');
let thumbs = [];
let shown = 0;
function view(i) {
    shown = (i + thumbs.length) % thumbs.length;
    const t = thumbs[shown];
    const isVideo = t.href.endsWith('.mp4');
    const m = document.createElement(isVideo ? 'video' : 'img');
    m.src = t.getAttribute('href');
    if (isVideo) {
        m.autoplay = true;
        m.playsInline = true;
        m.volume = vol.value / 100;
        m.muted = mute.getAttribute('aria-pressed') === 'true';
        m.addEventListener('click', () => m.paused ? m.play() : m.pause());
        m.addEventListener('timeupdate', () => {
            if (m.duration) seek.value = m.currentTime / m.duration * 1000;
            mpTime.textContent = `${fmt(m.currentTime)} / ${fmt(m.duration || 0)}`;
        });
    } else m.alt = t.textContent;
    stage.replaceChildren(m);
    mp.hidden = !isVideo;
    bar.hidden = isVideo;
    seek.value = 0;
    document.getElementById('viewer-name').textContent = t.textContent + (isVideo ? ' - Media Player' : ' - Image Viewer');
    document.getElementById('viewer-pos').textContent = `${shown + 1} of ${thumbs.length}`;
    open('viewer');
}
document.querySelectorAll('a.thumb').forEach(t => t.addEventListener('click', e => {
    e.preventDefault();
    thumbs = [...t.parentElement.querySelectorAll('a.thumb')];
    view(thumbs.indexOf(t));
}));
// Media Player transport for videos.
const mp = document.getElementById('mp');
const bar = document.getElementById('viewer-bar');
const seek = document.getElementById('mp-seek');
const mpTime = document.getElementById('mp-time');
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const video = () => stage.querySelector('video');
const mpActions = {
    play: v => v.play(),
    pause: v => v.pause(),
    stop: v => { v.pause(); v.currentTime = 0; },
    rew: v => { v.currentTime -= 5; },
    ff: v => { v.currentTime += 5; },
    prev: () => view(shown - 1),
    next: () => view(shown + 1),
};
mp.addEventListener('click', e => {
    const b = e.target.closest('[data-mp]');
    if (b && video()) mpActions[b.dataset.mp](video());
});
const vol = document.getElementById('mp-vol');
const mute = document.getElementById('mp-mute');
vol.addEventListener('input', () => { const v = video(); if (v) v.volume = vol.value / 100; });
mute.addEventListener('click', () => {
    const on = mute.getAttribute('aria-pressed') !== 'true';
    mute.setAttribute('aria-pressed', on);
    const v = video();
    if (v) v.muted = on;
});
seek.addEventListener('input', () => { const v = video(); if (v?.duration) v.currentTime = seek.value / 1000 * v.duration; });
document.getElementById('viewer-prev').addEventListener('click', () => view(shown - 1));
document.getElementById('viewer-next').addEventListener('click', () => view(shown + 1));
win('viewer').addEventListener('keydown', e => {
    if (e.target === seek || e.target === vol) return;
    if (e.key === 'ArrowLeft') view(shown - 1);
    if (e.key === 'ArrowRight') view(shown + 1);
});

// Start menu.
function closeStart() { startMenu.hidden = true; startBtn.setAttribute('aria-expanded', 'false'); }
startBtn.addEventListener('click', () => {
    const show = startMenu.hidden;
    startMenu.hidden = !show;
    startBtn.setAttribute('aria-expanded', show);
    if (show) startMenu.querySelector('button').focus();
});
document.addEventListener('pointerdown', e => {
    if (!startMenu.hidden && !e.target.closest('#start-menu, #start-btn')) closeStart();
});
startMenu.addEventListener('keydown', e => {
    const items = [...startMenu.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !startMenu.hidden) { closeStart(); startBtn.focus(); }
});

// Shut down.
const shutdown = document.getElementById('shutdown');
startMenu.querySelector('[data-shutdown]').addEventListener('click', () => {
    closeStart();
    shutdown.hidden = false;
    document.getElementById('restart').focus();
});
document.getElementById('restart').addEventListener('click', () => location.reload());

// Clock.
const clock = document.getElementById('clock');
const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
tick();
setInterval(tick, 10000);

// Only hide the stacked fallback once everything above has run.
document.documentElement.classList.add('js');
const fromHash = { about: 'about', skills: 'skills', projects: 'projects', photos: 'photos', japan: 'japan', vietnam: 'vietnam', contact: 'contact' }[location.hash.slice(1)];
open(fromHash || 'welcome');
