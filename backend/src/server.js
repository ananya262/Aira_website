const app = require('./app');

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`AIRA-DBMS API listening on http://localhost:${port}`);
});
