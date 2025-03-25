// Script to generate game sounds
const fs = require('fs');
const { exec } = require('child_process');

// Generate tone using SoX command line utility
// Note: This requires SoX to be installed: http://sox.sourceforge.net/
const generateFlap = () => {
  exec('sox -n -r 44100 -c 1 assets/sounds/flap.wav synth 0.15 sine 380 fade 0 0.15 0.02');
  console.log('Generated flap sound');
};

const generateScore = () => {
  exec('sox -n -r 44100 -c 1 assets/sounds/score.wav synth 0.15 sine 880 fade 0 0.15 0.1 synth 0.15 sine 1108 fade 0 0.15 0.1 remix 1,2');
  console.log('Generated score sound');
};

const generateHit = () => {
  exec('sox -n -r 44100 -c 1 assets/sounds/hit.wav synth 0.2 noise fade 0 0.2 0.05 synth 0.1 sine 200 fade 0 0.1 0.02 remix 1,2');
  console.log('Generated hit sound');
};

// Generate all sounds
generateFlap();
generateScore();
generateHit();

console.log('All sounds generated. If you don\'t have SoX installed, you\'ll need to create sound files manually.');