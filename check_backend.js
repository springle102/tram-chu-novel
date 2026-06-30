// Diagnostic script for Trạm Chữ Novel
const net = require('net');
const path = require('path');
const fs = require('fs');

console.log('=== TRẠM CHỮ NOVEL DIAGNOSTIC START ===\n');

// 1. Check syntax of modified files
console.log('1. Checking file syntax...');
const filesToCheck = [
  './backend/src/routes/notifications.js',
  './backend/src/controllers/storiesController.js',
  './app/components/Header.tsx',
  './app/stories/[slug]/page.tsx'
];

filesToCheck.forEach(file => {
  const absolutePath = path.resolve(file);
  if (fs.existsSync(absolutePath)) {
    try {
      if (file.endsWith('.js')) {
        require(absolutePath);
        console.log(`  ✓ ${file}: OK (Syntax and imports valid)`);
      } else {
        console.log(`  ✓ ${file}: Present (TypeScript files checked by Next.js compiler)`);
      }
    } catch (err) {
      console.error(`  ❌ ${file} has a runtime load/syntax error:`);
      console.error(err);
    }
  } else {
    console.error(`  ❌ File not found: ${file}`);
  }
});

// 2. Check Database port (5432)
console.log('\n2. Checking PostgreSQL port 5432...');
const pgClient = new net.Socket();
pgClient.setTimeout(2000);
pgClient.connect(5432, '127.0.0.1', () => {
  console.log('  ✓ Port 5432 is OPEN (PostgreSQL is running)');
  pgClient.destroy();
  testDbConnection();
}).on('error', (err) => {
  console.log('  ❌ Port 5432 is CLOSED. PostgreSQL database is NOT running!');
  console.log('     Please start PostgreSQL service on your computer.');
  pgClient.destroy();
  checkBackendPort();
}).on('timeout', () => {
  console.log('  ❌ Port 5432 connection TIMEOUT. PostgreSQL might not be running.');
  pgClient.destroy();
  checkBackendPort();
});

// 3. Test database connection
function testDbConnection() {
  console.log('\n3. Testing PostgreSQL database connection...');
  // Load .env
  const dotenvPath = path.resolve('./backend/.env');
  if (fs.existsSync(dotenvPath)) {
    const dotenv = require(path.resolve('./backend/node_modules/dotenv'));
    dotenv.config({ path: dotenvPath });
  }
  
  const { Pool } = require(path.resolve('./backend/node_modules/pg'));
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'Violet_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
  });
  
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('  ❌ DB Connection failed:');
      console.error(`     Message: ${err.message}`);
      console.error('     Please check database name and credentials in backend/.env');
    } else {
      console.log(`  ✓ DB Connection success! Host: ${pool.options.host}, Database: ${pool.options.database}`);
      console.log(`     Server time: ${res.rows[0].now}`);
    }
    pool.end();
    checkBackendPort();
  });
}

// 4. Check Backend port (5000)
function checkBackendPort() {
  console.log('\n4. Checking Backend port 5000...');
  const backendClient = new net.Socket();
  backendClient.setTimeout(2000);
  backendClient.connect(5000, '127.0.0.1', () => {
    console.log('  ✓ Port 5000 is OPEN. Backend API is running!');
    backendClient.destroy();
    finish();
  }).on('error', (err) => {
    console.log('  ❌ Port 5000 is CLOSED. Backend API Server is NOT running!');
    console.log('     Please start the backend by opening a terminal in the "backend" directory and running:');
    console.log('     npm run dev');
    backendClient.destroy();
    finish();
  }).on('timeout', () => {
    console.log('  ❌ Port 5000 connection TIMEOUT. Backend might not be responding.');
    backendClient.destroy();
    finish();
  });
}

function finish() {
  console.log('\n=== TRẠM CHỮ NOVEL DIAGNOSTIC END ===');
}
