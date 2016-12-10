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
    doc.write('__TEMPLATE__');
    this.addStyle(this.options.style);
    const tpv = els.container = doc.querySelector('.tpv');
    const video = els.video = doc.querySelector('video');
    els.progress = {
      body: doc.querySelector('.tpv-progress'),
      played: doc.querySelector('.tpv-played'),
      cursor: doc.querySelector('.tpv-cursor'),
    };
    els.volume = {
      menu: doc.querySelector('.tpv-volume'),
      panel: doc.querySelector('.tpv-volume-panel'),
      body: doc.querySelector('.tpv-volume-body'),
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
      this.hidePopups(e.target);
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

    function stopEvent(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    function getOffset(e, target) {
      target = target || e.target;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return {
        x,
        y,
        w: rect.right - rect.left,
        h: rect.bottom - rect.top,
      };
    }
    function bindBarEvents(data, onUpdate, vertical) {
      function getMovingPos(e) {
        const {moving} = data;
        const {x, y, w, h} = getOffset(e, data.body);
        const x1 = x - (moving ? moving.deltaX : 0);
        const y1 = y - (moving ? moving.deltaY : 0);
        let p = vertical ? 1 - y1 / h : x1 / w;
        if (p < 0) p = 0;
        else if (p > 1) p = 1;
        return p;
      }
      function onMouseMove(e) {
        const pos = getMovingPos(e) * 100 + '%';
        if (vertical) {
          data.cursor.style.bottom = pos;
        } else {
          data.cursor.style.left = pos;
        }
      }
      function onMouseUp(e) {
        stopEvent(e);
        onUpdate(getMovingPos(e));
        data.moving = null;
        doc.removeEventListener('mousemove', onMouseMove, false);
        doc.removeEventListener('mouseup', onMouseUp, true);
      }
      function onMouseDown(e) {
        stopEvent(e);
        const {x, y, w, h} = getOffset(e);
        data.moving = {
          deltaX: x - w / 2,
          deltaY: y - h / 2,
        };
        doc.addEventListener('mousemove', onMouseMove, false);
        doc.addEventListener('mouseup', onMouseUp, true);
      }
      data.cursor.addEventListener('mousedown', onMouseDown, false);
      data.body.addEventListener('mouseup', e => {
        onUpdate(getMovingPos(e));
      }, false);
    }
    bindBarEvents(els.progress, p => this.setProgress(p));
    bindBarEvents(els.volume, p => this.setVolume(p), true);
    this.onVolumeChange();
  }

  hidePopups(exceptChild) {
    Array.prototype.forEach.call(this.els.iframe.contentDocument.querySelectorAll('.open'), menu => {
      if (exceptChild && menu.contains(exceptChild)) return;
      menu.classList.remove('open');
    });
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
    this.url = url;
    this.els.video.src = this.url;
  }

  setProgress(p) {
    const {video} = this.els;
    video.currentTime = p * video.duration;
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
    if (!els.volume.moving) {
      els.volume.cursor.style.bottom = els.video.volume * 100 + '%';
    }
  }

  onTimeUpdate() {
    const {els} = this;
    const {currentTime, duration} = els.video;
    els.time.textContent = `${this.formatTime(currentTime)}/${this.formatTime(duration)}`;
    const width = currentTime / duration * 100 + '%';
    els.progress.played.style.width = width;
    if (!els.progress.moving) {
      els.progress.cursor.style.left = width;
    }
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
