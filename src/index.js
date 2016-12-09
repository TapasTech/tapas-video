import EventEmitter from './events';

const icons = {
  play: '__ICON_play__',
  pause: '__ICON_pause__',
  volume: '__ICON_volume__',
  fullscreen: '__ICON_fullscreen__',
};

function leftpad(s, len, p='0') {
  s = s.toString();
  while (s.length < len) s = p + s;
  return s;
}

function findClosest(el, predicate, stop) {
  while (el && el !== stop && !predicate(el)) el = el.parentNode;
  if (el === stop) el = null;
  return el || null;
}

export default class Video extends EventEmitter {
  constructor(container, options) {
    super();
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    options = this.options = Object.assign({
      style: '__STYLE__',
    }, options);
    options.icons = Object.assign({}, icons, options.icons);
    this.init(container);
  }

  init(wrap) {
    if (!wrap) {
      throw new Error('Container element is required!');
    }
    const els = this.els = {};
    const el = els.iframe = document.createElement('iframe');
    el.allowFullscreen = true;
    wrap.appendChild(el);
    el.className = 'tapas-video';
    el.setAttribute('style', 'width:100%;height:100%;border:none;');
    const doc = el.contentDocument;
    doc.write(`\
<div class="tpv">
  <video></video>
  <div class="tpv-ctrl">
    <div class="tpv-icon" data-action="play"></div>
    <div class="tpv-progress">
      <div class="tpv-bar"><div class="tpv-played"></div></div>
      <div class="tpv-cursor"></div>
    </div>
    <div class="tpv-volume">
      <div class="tpv-icon" data-action="volume"></div>
      <div class="tpv-volume-panel menu">
        <div class="tpv-volume-body">
          <div class="tpv-volume-bar"></div>
          <div class="tpv-volume-cursor"></div>
        </div>
      </div>
    </div>
    <div class="tpv-time"></div>
    <div class="tpv-icon" data-action="fullscreen"></div>
  </div>
</div>`);
    this.addStyle(this.options.style);
    const tpv = els.container = doc.querySelector('.tpv');
    const video = els.video = doc.querySelector('video');
    els.cursor = doc.querySelector('.tpv-cursor');
    els.volume = {
      menu: doc.querySelector('.tpv-volume'),
      cursor: doc.querySelector('.tpv-volume-cursor'),
    };
    els.time = doc.querySelector('.tpv-time');
    els.items = {};
    Array.prototype.forEach.call(doc.querySelectorAll('.tpv-icon'), icon => {
      const action = icon.getAttribute('data-action');
      icon.innerHTML = this.getIcon(action);
      els.items[action] = icon;
    });
    [
      'canplay',
      'durationchange',
      'ended',
      'pause',
      'play',
      'playing',
      'progress',
      'volumechange',
      'timeupdate',
    ].forEach(type => {
      video.addEventListener(type, event => {
        this.emit(type, event);
      }, false);
    });
    this.on('pause', e => this.onStatusChange());
    this.on('playing', e => this.onStatusChange());
    this.on('volumechange', e => this.onVolumeChange());
    this.on('durationchange', e => this.onTimeUpdate());
    this.on('timeupdate', e => this.onTimeUpdate());
    tpv.addEventListener('click', e => {
      Array.prototype.forEach.call(doc.querySelectorAll('.open'), menu => {
        !menu.contains(e.target) && menu.classList.remove('open');
      });
      const target = findClosest(e.target, el => el.hasAttribute('data-action'), tpv);
      if (target) {
        const action = target.getAttribute('data-action');
        const handle = this[`handle_${action}`];
        if (handle) {
          handle.call(this);
          return;
        }
      }
    }, false);
    this.onVolumeChange();
  }

  addStyle(css) {
    if (!css) return;
    const doc = this.els.iframe.contentDocument;
    const style = doc.createElement('style');
    style.innerHTML = css;
    doc.head.appendChild(style);
  }

  getIcon(name) {
    const {icons} = this.options;
    const icon = typeof icons === 'function' ? icons(name, this) : icons[name];
    return icon || '';
  }

  setVideo(url) {
    console.log('set video:', url);
    this.url = url;
    this.els.video.src = this.url;
  }

  play() {
    if (!this.url) return;
    this.emit('play');
    this.els.video.play();
  }

  setVolume(v) {
    this.els.video.volume = v;
  }

  onStatusChange() {
    const {els} = this;
    els.items.play.innerHTML = this.getIcon(els.video.paused ? 'play' : 'pause');
  }

  onVolumeChange() {
    const {els} = this;
    els.volume.cursor.style.bottom = els.video.volume * 100 + '%';
  }

  onTimeUpdate() {
    const {els} = this;
    const {currentTime, duration} = els.video;
    els.time.textContent = `${this.formatTime(currentTime)}/${this.formatTime(duration)}`;
    els.cursor.style.left = currentTime / duration * 100 + '%';
  }

  formatTime(time) {
    time = ~~ time;
    if (isNaN(time)) return '??:??';
    const parts = [time % 60];
    time = ~~ (time / 60);
    if (time >= 60) {
      parts.unshift(time % 60);
      time = ~~ (time / 60);
    }
    parts.unshift(time);
    return parts.map(part => leftpad(part, 2)).join(':');
  }

  handle_play() {
    const {video} = this.els;
    video.paused ? video.play() : video.pause();
  }

  handle_fullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      exitFullscreen && exitFullscreen.call(document);
    } else {
      const {iframe} = this.els;
      const requestFullscreen = iframe.requestFullscreen || iframe.webkitRequestFullscreen;
      requestFullscreen && requestFullscreen.call(iframe);
    }
  }

  handle_volume() {
    this.els.volume.menu.classList.toggle('open');
  }
}
