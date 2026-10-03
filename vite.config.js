import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const DEFAULT_LOCAL_CODE_DIR = 'C:\\Users\\user\\Documents\\code';
let currentLocalCodeDir = process.env.LOCAL_CODE_DIR || DEFAULT_LOCAL_CODE_DIR;

function getBaseDir(req, explicitDir) {
  const fromHeader = req.headers['x-local-code-dir'];
  if (fromHeader && typeof fromHeader === 'string' && fromHeader.trim()) {
    return path.resolve(fromHeader.trim());
  }
  if (explicitDir && typeof explicitDir === 'string' && explicitDir.trim()) {
    return path.resolve(explicitDir.trim());
  }
  return currentLocalCodeDir;
}

function localCodeSyncPlugin() {
  return {
    name: 'local-code-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/local-code')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost:5173');
        const pathname = urlObj.pathname;

        res.setHeader('Content-Type', 'application/json');

        // 0) 경로 설정 조회: GET /api/local-code/config
        if (pathname === '/api/local-code/config' && req.method === 'GET') {
          try {
            res.end(JSON.stringify({
              success: true,
              baseDir: currentLocalCodeDir,
              defaultDir: DEFAULT_LOCAL_CODE_DIR,
              exists: fs.existsSync(currentLocalCodeDir),
            }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
          return;
        }

        // 0-1) 경로 설정 변경: POST /api/local-code/config
        if (pathname === '/api/local-code/config' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try {
              const { baseDir } = JSON.parse(body);
              if (!baseDir || typeof baseDir !== 'string') {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'baseDir is required' }));
                return;
              }
              currentLocalCodeDir = path.resolve(baseDir.trim());
              if (!fs.existsSync(currentLocalCodeDir)) {
                fs.mkdirSync(currentLocalCodeDir, { recursive: true });
              }
              res.end(JSON.stringify({
                success: true,
                message: 'Local code base directory updated',
                baseDir: currentLocalCodeDir,
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        const activeBaseDir = getBaseDir(req, urlObj.searchParams.get('baseDir'));

        // 1) 상태 확인: GET /api/local-code/status
        if (pathname === '/api/local-code/status' && req.method === 'GET') {
          try {
            const exists = fs.existsSync(activeBaseDir);
            const files = exists ? fs.readdirSync(activeBaseDir) : [];
            res.end(JSON.stringify({ success: true, baseDir: activeBaseDir, exists, files }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
          return;
        }

        // 2) 파일 읽기: GET /api/local-code/read?projectId=payments-api&fileName=users.ts&relativePath=src/routes/users.ts
        if (pathname === '/api/local-code/read' && req.method === 'GET') {
          const fileName = urlObj.searchParams.get('fileName');
          const projectId = urlObj.searchParams.get('projectId');
          const relativePath = urlObj.searchParams.get('relativePath');
          if (!fileName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'fileName is required' }));
            return;
          }

          // 탐색 순서: 계층 구조 경로 우선 -> 프로젝트 폴더 -> 루트 경로
          const candidatePaths = [
            projectId && relativePath ? path.join(activeBaseDir, projectId, relativePath) : null,
            projectId ? path.join(activeBaseDir, projectId, fileName) : null,
            relativePath ? path.join(activeBaseDir, relativePath) : null,
            path.join(activeBaseDir, fileName),
          ].filter(Boolean);

          const matchedPath = candidatePaths.find((p) => fs.existsSync(p));
          if (!matchedPath) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'File not found', searched: candidatePaths }));
            return;
          }

          try {
            const content = fs.readFileSync(matchedPath, 'utf-8');
            res.end(JSON.stringify({
              success: true,
              fileName,
              filePath: matchedPath,
              content,
              lines: content.split('\n'),
            }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
          return;
        }

        // 3) 파일 쓰기: POST /api/local-code/write
        if (pathname === '/api/local-code/write' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const { projectId, fileName, relativePath, content, baseDir } = parsed;
              const effectiveDir = getBaseDir(req, baseDir);
              if (!fileName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'fileName is required' }));
                return;
              }

              const strContent = Array.isArray(content) ? content.join('\n') : String(content);

              // 1순위: 프로젝트 하위 계층 경로에 저장 (예: C:\Users\user\Documents\code\payments-api\src\routes\users.ts)
              let savedPath = '';
              if (projectId && relativePath) {
                savedPath = path.join(effectiveDir, projectId, relativePath);
                fs.mkdirSync(path.dirname(savedPath), { recursive: true });
                fs.writeFileSync(savedPath, strContent, 'utf-8');
              } else if (projectId) {
                savedPath = path.join(effectiveDir, projectId, fileName);
                fs.mkdirSync(path.dirname(savedPath), { recursive: true });
                fs.writeFileSync(savedPath, strContent, 'utf-8');
              }

              // 2순위: 루트 호환 경로에도 저장 (단일 파일 접근 호환성 유지)
              const rootPath = path.join(effectiveDir, fileName);
              fs.writeFileSync(rootPath, strContent, 'utf-8');
              if (!savedPath) savedPath = rootPath;

              res.end(JSON.stringify({
                success: true,
                message: `File ${fileName} saved successfully`,
                filePath: savedPath,
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // 4) 파일 또는 폴더 삭제: POST /api/local-code/delete
        if (pathname === '/api/local-code/delete' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { projectId, fileName, relativePath, baseDir } = JSON.parse(body);
              const effectiveDir = getBaseDir(req, baseDir);
              const targetRel = relativePath || fileName;
              if (!targetRel) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'relativePath or fileName is required' }));
                return;
              }

              const candidatePaths = [
                projectId && relativePath ? path.join(effectiveDir, projectId, relativePath) : null,
                projectId && fileName ? path.join(effectiveDir, projectId, fileName) : null,
                relativePath ? path.join(effectiveDir, relativePath) : null,
                path.join(effectiveDir, fileName || ''),
              ].filter(Boolean);

              let deletedAny = false;
              for (const p of candidatePaths) {
                if (fs.existsSync(p)) {
                  const stat = fs.statSync(p);
                  if (stat.isDirectory()) {
                    fs.rmSync(p, { recursive: true, force: true });
                  } else {
                    fs.unlinkSync(p);
                  }
                  deletedAny = true;
                }
              }

              res.end(JSON.stringify({
                success: true,
                message: deletedAny ? 'Deleted successfully' : 'File was not on disk, cleaned up memory',
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // 5) 파일 또는 폴더 이름 변경: POST /api/local-code/rename
        if (pathname === '/api/local-code/rename' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { projectId, oldPath, newPath, oldName, newName, baseDir } = JSON.parse(body);
              const effectiveDir = getBaseDir(req, baseDir);
              const finalOldRel = oldPath || oldName;
              const finalNewRel = newPath || newName;
              if (!finalOldRel || !finalNewRel) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Both old and new paths are required' }));
                return;
              }

              const targetOld = projectId
                ? path.join(effectiveDir, projectId, finalOldRel)
                : path.join(effectiveDir, finalOldRel);
              const targetNew = projectId
                ? path.join(effectiveDir, projectId, finalNewRel)
                : path.join(effectiveDir, finalNewRel);

              if (fs.existsSync(targetOld)) {
                fs.mkdirSync(path.dirname(targetNew), { recursive: true });
                fs.renameSync(targetOld, targetNew);
              }

              // 루트 호환 파일도 존재 시 이름 변경
              if (oldName && newName) {
                const rootOld = path.join(effectiveDir, oldName);
                const rootNew = path.join(effectiveDir, newName);
                if (fs.existsSync(rootOld)) {
                  fs.renameSync(rootOld, rootNew);
                }
              }

              res.end(JSON.stringify({
                success: true,
                message: 'Renamed successfully',
                newPath: targetNew,
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localCodeSyncPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
