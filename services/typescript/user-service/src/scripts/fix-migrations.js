const fs = require('fs');
const path = require('path');

const dir = 'src/migrations';
const files = fs.readdirSync(dir);

files.forEach((file) => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Fix the double backslashes that were accidentally introduced
    // Replace \\` with \`
    content = content.replace(/\\\\`/g, '\\`');

    fs.writeFileSync(filePath, content);
    console.log(`Restored: ${file}`);
  }
});
