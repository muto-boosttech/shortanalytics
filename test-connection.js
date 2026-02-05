const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT 1 as test');
  })
  .then((result) => {
    console.log('Query result:', result.rows);
    client.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
