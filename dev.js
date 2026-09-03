const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const FRONTEND_PORT = '3000';
const BACKEND_PORT = '5000';
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const API_URL = `http://localhost:${BACKEND_PORT}`;
const frontendCli = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const backendEntry = path.join(__dirname, 'backend', 'src', 'server.js');

function runService(name, command, args, options = {}) {
  console.log(`[System] Starting ${name}...`);
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: 'inherit',
    ...options,
  });

  child.on('error', (error) => {
    console.error(`[System] ${name} failed to start:`, error.message);
    stopAll(1);
  });

  child.on('close', (code) => {
    if (!isShuttingDown) {
      console.error(`[System] ${name} stopped unexpectedly (code ${code}).`);
      stopAll(code || 1);
    }
  });

  return child;
}

const children = [];
let isShuttingDown = false;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(Number(port));
  });
}

function stopAll(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[System] Stopping all services...');

  for (const child of children) {
    if (!child.pid) continue;

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

async function startAll() {
  const ports = [
    { name: 'Frontend', port: FRONTEND_PORT },
    { name: 'Backend', port: BACKEND_PORT },
  ];
  const occupiedPorts = [];

  for (const service of ports) {
    if (!(await isPortAvailable(service.port))) {
      occupiedPorts.push(`${service.name} (${service.port})`);
    }
  }

  if (occupiedPorts.length > 0) {
    console.error(`[System] Không thể khởi động: port đang được sử dụng - ${occupiedPorts.join(', ')}.`);
    console.error('[System] Hãy dừng service cũ rồi chạy lại "npm run dev".');
    process.exitCode = 1;
    return;
  }

  console.log('=== TRẠM CHỮ NOVEL — STARTING ALL SERVICES ===');
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend:  ${API_URL}`);
  console.log('');

  // The backend always listens on 5000 in the combined local workflow.
  children.push(runService('Backend', process.execPath, ['--watch', backendEntry], {
    cwd: path.join(__dirname, 'backend'),
    env: {
      ...process.env,
      PORT: BACKEND_PORT,
    },
  }));

  // Passing -p prevents Next.js from silently switching to 3001/3002 when 3000 is busy.
  // The API URL is also fixed here so every browser request goes to the backend port.
  children.push(runService('Frontend', process.execPath, [frontendCli, 'dev', '-p', FRONTEND_PORT], {
    cwd: __dirname,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: API_URL,
    },
  }));
}

startAll().catch((error) => {
  console.error('[System] Could not start development services:', error.message);
  stopAll(1);
});
