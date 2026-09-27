const fs = require('fs');
const path = require('path');

const bufferSize = 720; // hold a full simulation run
const buffer = [];

function addPoint(data) {
  buffer.push({ timestamp: Date.now(), ...data });
  if (buffer.length > bufferSize) {
    buffer.shift();
  }
}

function getBuffer() {
  return [...buffer];
}

function clear() {
  buffer.length = 0;
}

function saveScenario(name) {
  const dir = path.join(__dirname, 'scenarios');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(buffer, null, 2));
  return filePath;
}

module.exports = { addPoint, getBuffer, clear, saveScenario };
