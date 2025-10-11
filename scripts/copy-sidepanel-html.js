const fs = require('fs');
const path = require('path');

const sidepanelHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TabQuest</title>
    <link rel="stylesheet" href="assets/popup.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="sidepanel.js"></script>
  </body>
</html>`;

const outputPath = path.join(__dirname, '..', '.output', 'chrome-mv3', 'sidepanel.html');

fs.writeFileSync(outputPath, sidepanelHtml);
console.log('✅ Created sidepanel.html');
