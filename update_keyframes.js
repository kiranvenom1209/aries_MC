const fs = require('fs');

const path = process.argv[2];
let content = fs.readFileSync(path, 'utf8');

const oldKeyframes = /@keyframes drillPan \{[\s\S]*?\}/;
const newKeyframes = `@keyframes drillPathPan {
  0% { background-position: 44.4% 17.1%; }
  15.3% { background-position: 66.7% 31.4%; }
  40.1% { background-position: 68.9% 82.9%; }
  67.9% { background-position: 24.4% 74.3%; }
  83.4% { background-position: 42.2% 51.4%; }
  100% { background-position: 44.4% 17.1%; }
}`;

if (oldKeyframes.test(content)) {
    content = content.replace(oldKeyframes, newKeyframes);
} else {
    content += '\n' + newKeyframes;
}

fs.writeFileSync(path, content);
