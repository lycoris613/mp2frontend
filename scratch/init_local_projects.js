import fs from 'fs';
import path from 'path';
import { PROJECTS_DATA } from '../src/data/findingData.js';

const BASE_DIR = 'C:\\Users\\user\\Documents\\code';

console.log('Generating structured local project files in:', BASE_DIR);

if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

Object.keys(PROJECTS_DATA).forEach((projectId) => {
  const proj = PROJECTS_DATA[projectId];
  const projDir = path.join(BASE_DIR, projectId);
  
  if (!fs.existsSync(projDir)) {
    fs.mkdirSync(projDir, { recursive: true });
  }

  const filePaths = proj.filePaths || {};
  const fileData = proj.fileFindingData || {};

  Object.keys(fileData).forEach((fileName) => {
    const item = fileData[fileName];
    if (!item || !Array.isArray(item.codeLines)) return;

    // 계층 경로 결정: filePaths[fileName] 우선, 없으면 fileName
    const relativePath = filePaths[fileName] || fileName;
    const targetFilePath = path.join(projDir, relativePath);
    const targetDir = path.dirname(targetFilePath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const content = item.codeLines.join('\n');
    fs.writeFileSync(targetFilePath, content, 'utf-8');
    console.log(`[Created] ${projectId}/${relativePath}`);
  });
});

console.log('All structured project files generated successfully!');
