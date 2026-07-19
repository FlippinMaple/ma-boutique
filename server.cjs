(async () => {
  try {
    await import('./server/server.js');
  } catch (err) {
    console.error('BOOTSTRAP_IMPORT_FAILED:', err);
    process.exit(1);
  }
})();
