const Video = require('tapas-video');

const video = new Video('#app');
video.setVideo('/temp/Dear Friends [Deutsch].mkv');
// video.setVideo('/temp/big_buck_bunny.mp4');
video.play();
