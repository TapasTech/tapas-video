tapas-video
===

![NPM](https://img.shields.io/npm/v/tapas-video.svg)
![License](https://img.shields.io/npm/l/tapas-video.svg)
![Downloads](https://img.shields.io/npm/dt/tapas-video.svg)

A Video player based on HTML5 `<video>`.

Installation
---

``` sh
$ npm i tapas-video
```

Quick start
---

``` js
const Video = require('tapas-video');

const video = new Video('#container');
video.setVideo('http://path/to/video');
video.play();
```