const Video = require('tapas-video');

function load() {
  const source = location.hash.slice(1);
  if (source) {
    video.setVideo(source);
    video.play();
  }
}

const video = new Video('#app');
load();
window.addEventListener('hashchange', load);
