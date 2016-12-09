import EventEmitter from './events';

const icons = {
  play: '__ICON_play__',
  pause: '__ICON_pause__',
  volume: '__ICON_volume__',
  fullscreen: '__ICON_fullscreen__',
};

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
    const el = this.el = document.createElement('iframe');
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
      <div class="tpv-volume-panel">
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
    const tpv = doc.querySelector('.tpv');
    tpv.addEventListener('click', e => {
      let target;
      for (target = e.target; target !== tpv && !target.hasAttribute('data-action'); target = target.parentNode);
      const action = target.getAttribute('data-action');
      const handle = this[`handle_${action}`];
      handle && handle.call(this);
    }, false);
    const video = this.video = doc.querySelector('video');
    Array.prototype.forEach.call(doc.querySelectorAll('.tpv-icon'), icon => {
      icon.innerHTML = this.getIcon(icon.getAttribute('data-action'));
    });
    [
      'canplay',
      'durationchange',
      'ended',
      'play',
      'pause',
      'playing',
      'progress',
    ].forEach(type => {
      video.addEventListener(type, event => {
        this.emit(type, event);
      }, false);
    });
  }

  addStyle(css) {
    if (!css) return;
    const doc = this.el.contentDocument;
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
    this.video.src = this.url;
  }

  play() {
    if (!this.url) return;
    this.emit('play');
    console.log('play');
    this.video.play();
  }

  handle_fullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      exitFullscreen && exitFullscreen.call(document);
    } else {
      const requestFullscreen = this.el.requestFullscreen || this.el.webkitRequestFullscreen;
      requestFullscreen && requestFullscreen.call(this.el);
    }
  }
}
