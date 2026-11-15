import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

type FormMessages = Record<'sending' | 'done' | 'empty' | 'bad' | 'slow' | 'many' | 'fail', string>;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const LAST = 6;

function watchSections() {
  const stage = byId('stage');
  const bar = byId('mbar');
  const stageImgs = [...stage.querySelectorAll<HTMLImageElement>('[data-screen-img]')];
  const sections = [...document.querySelectorAll<HTMLElement>('.sec')];
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target as HTMLElement;
        section.classList.add('on');
        bar.classList.toggle('hide', section.id === 's7');
        if (document.documentElement.classList.contains('motion')) return;
        const n = Number(section.dataset.screen);
        stage.classList.toggle('off', n < 0);
        if (n >= 0) stageImgs.forEach((img, k) => img.classList.toggle('on', k === n));
      }),
    { rootMargin: '-45% 0px -45% 0px' },
  );
  sections.forEach((s) => io.observe(s));
  requestAnimationFrame(() => sections[0].classList.add('on'));
}

function startMotion() {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  root.classList.add('motion');
  const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  let busy = false;
  let busyTimer = 0;
  const setBusy = (on: boolean) => {
    busy = on;
    clearTimeout(busyTimer);
    if (on) busyTimer = window.setTimeout(() => (busy = false), 1500);
  };
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = a.getAttribute('href') ?? '';
      if (target.length < 2) return;
      e.preventDefault();
      setBusy(false);
      lenis.scrollTo(target, { duration: 1.4 });
    }),
  );

  gsap.to('.scr img.k', {
    scale: 1.12,
    xPercent: -3,
    yPercent: 2,
    duration: 9,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
  gsap.to('.scr img.f', {
    scale: 1.06,
    yPercent: -3,
    duration: 7,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
  gsap.to('.scr img.c', { scale: 1.04, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  const tiles = (dist: number) =>
    document.querySelectorAll<HTMLElement>('.tile').forEach((tile) => {
      const st = { trigger: '#s5', start: 'top bottom', end: 'top top', scrub: true };
      gsap.fromTo(
        tile,
        { y: Number(tile.dataset.d) * dist },
        { y: 0, ease: 'none', scrollTrigger: st },
      );
      gsap.fromTo(
        tile.querySelector('img'),
        { scale: 1.35 },
        { scale: 1, ease: 'none', scrollTrigger: { ...st } },
      );
    });
  gsap.fromTo(
    '#endImg',
    { scale: 1.25, yPercent: -6 },
    {
      scale: 1,
      yPercent: 0,
      ease: 'none',
      scrollTrigger: { trigger: '#s7', start: 'top bottom', end: 'top top', scrub: true },
    },
  );

  const mm = gsap.matchMedia();
  mm.add('(min-width: 1100px)', () => {
    tiles(2.2);
    const phone = byId('phone');
    const [imK, imF, imC, imP] = [...phone.querySelectorAll<HTMLImageElement>('[data-screen-img]')];
    const fill = () =>
      Math.max(innerWidth / phone.offsetWidth, innerHeight / phone.offsetHeight) * 1.06;
    const setFill = () => root.style.setProperty('--S', String(fill()));
    setFill();
    ScrollTrigger.addEventListener('refreshInit', setFill);
    gsap.set([imF, imC, imP], { opacity: 0 });
    gsap.set(imK, { opacity: 1 });
    gsap.from('#shot img', { scale: 1.15, duration: 2.4, ease: 'power3.out' });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: 'main',
        start: 'top top',
        end: () => '+=' + LAST * innerHeight,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(
      phone,
      { scale: fill, rotationY: 0, rotationX: 0, y: 0, opacity: 1, force3D: false },
      { scale: 1, rotationY: -14, rotationX: 5, ease: 'power2.inOut', duration: 1 },
      0,
    )
      .to('#s0 .l, #s0 .r', { opacity: 0, y: -40, duration: 0.35 }, 0)
      .fromTo('#shade', { opacity: 1 }, { opacity: 0, duration: 0.45 }, 0.2)
      .fromTo('#shot', { opacity: 1 }, { opacity: 0, duration: 0.25 }, 0.72)
      .fromTo(
        '#phone .glare',
        { backgroundPosition: '90% 0' },
        { backgroundPosition: '20% 0', duration: 1 },
        0,
      )
      .to(phone, { rotationY: 13, rotationX: -3, duration: 1, ease: 'power1.inOut' }, 1)
      .to(imF, { opacity: 1, duration: 0.2 }, 1.4)
      .to(imK, { opacity: 0, duration: 0.2 }, 1.4)
      .to('#phone .glare', { backgroundPosition: '75% 0', duration: 1 }, 1)
      .to('body', { backgroundColor: '#121418', duration: 1 }, 1)
      .to(phone, { rotationY: -10, rotationX: 3, duration: 1, ease: 'power1.inOut' }, 2)
      .to(imC, { opacity: 1, duration: 0.2 }, 2.4)
      .to(imF, { opacity: 0, duration: 0.2 }, 2.4)
      .to('#phone .glare', { backgroundPosition: '30% 0', duration: 1 }, 2)
      .to('body', { backgroundColor: '#0a1020', duration: 1 }, 2)
      .to(phone, { rotationY: 0, rotationX: 0, duration: 1, ease: 'power1.inOut' }, 3)
      .to(imP, { opacity: 1, duration: 0.2 }, 3.4)
      .to(imC, { opacity: 0, duration: 0.2 }, 3.4)
      .to('#phone .glare', { backgroundPosition: '55% 0', duration: 1 }, 3)
      .to('body', { backgroundColor: '#000', duration: 1 }, 3)
      .to(
        phone,
        {
          y: () => innerHeight * 1.15,
          rotationX: 38,
          rotationZ: -7,
          duration: 0.8,
          ease: 'power2.in',
        },
        4,
      )
      .to(phone, { opacity: 0, duration: 0.1 }, 4.8)
      .to({}, { duration: 1.2 }, 4.8);

    let last = 0;
    const go = (i: number) => {
      setBusy(true);
      lenis.scrollTo(i * innerHeight, {
        duration: 1.05,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        lock: true,
        force: true,
        onComplete: () => window.setTimeout(() => setBusy(false), 120),
      });
    };
    const step = (dir: number) => {
      const i = Math.round(window.scrollY / innerHeight);
      const next = Math.max(0, Math.min(LAST, i + dir));
      if (next === i) return false;
      go(next);
      return true;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const now = performance.now();
      const gap = now - last;
      last = now;
      if (busy || gap < 160 || Math.abs(e.deltaY) < 3) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (step(Math.sign(e.deltaY))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const keys: Record<string, number> = {
      ArrowDown: 1,
      PageDown: 1,
      ' ': 1,
      ArrowUp: -1,
      PageUp: -1,
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input,textarea,button,select')) return;
      const dir = keys[e.key];
      if (!dir) return;
      if (busy) {
        e.preventDefault();
        return;
      }
      if (step(e.shiftKey && e.key === ' ' ? -1 : dir)) e.preventDefault();
    };
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('wheel', onWheel, { capture: true });
      document.removeEventListener('keydown', onKey);
      ScrollTrigger.removeEventListener('refreshInit', setFill);
      gsap.set('body', { clearProps: 'backgroundColor' });
    };
  });

  mm.add('(max-width: 1099px)', () => {
    tiles(1);
    document.querySelectorAll<HTMLElement>('.mphone .phone').forEach((p) =>
      gsap.fromTo(
        p,
        { rotationX: 32, y: 90, scale: 0.9, transformOrigin: '50% 100%' },
        {
          rotationX: 0,
          y: 0,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: p.parentElement,
            start: 'top 98%',
            end: 'top 35%',
            scrub: true,
          },
        },
      ),
    );
    gsap.to('.hero .bg img', {
      scale: 1.15,
      yPercent: 12,
      ease: 'none',
      scrollTrigger: { trigger: '#s0', start: 'top top', end: 'bottom top', scrub: true },
    });
    const colours: Record<string, string> = { s2: '#121418', s3: '#0a1020' };
    document.querySelectorAll<HTMLElement>('.sec').forEach((s) =>
      ScrollTrigger.create({
        trigger: s,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (st) => {
          if (st.isActive)
            gsap.to('body', {
              backgroundColor: colours[s.id] ?? '#000',
              duration: 0.6,
              ease: 'power1.inOut',
            });
        },
      }),
    );
    return () => gsap.set('body', { clearProps: 'backgroundColor' });
  });
}

function startForm() {
  const form = byId<HTMLFormElement>('form');
  const email = byId<HTMLInputElement>('email');
  const honeypot = byId<HTMLInputElement>('company');
  const done = byId('done');
  const button = form.querySelector('button') as HTMLButtonElement;
  const label = button.textContent;
  const msg = JSON.parse(form.dataset.msg ?? '{}') as FormMessages;
  let sending = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || honeypot.value) return;
    const value = email.value.trim();
    if (!value) return void (done.textContent = msg.empty);
    if (!/.+@.+\..+/.test(value)) return void (done.textContent = msg.bad);

    sending = true;
    button.disabled = true;
    button.textContent = msg.sending;
    done.textContent = '';
    try {
      const res = await fetch(form.dataset.endpoint ?? '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        form.hidden = true;
        done.textContent = msg.done;
        done.focus();
        return;
      }
      done.textContent = res.status === 400 ? msg.bad : res.status === 429 ? msg.many : msg.fail;
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      done.textContent = name === 'TimeoutError' || name === 'AbortError' ? msg.slow : msg.fail;
    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = label;
    }
  });
}

export function startLanding() {
  document.documentElement.classList.add('js-ready');
  watchSections();
  startForm();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) startMotion();
}
