const Video = require('tapas-video');

const video = new Video('#app');
const source = location.hash.slice(1);
if (source) {
  video.setVideo(source);
  video.play();
}