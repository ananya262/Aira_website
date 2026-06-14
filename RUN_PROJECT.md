Run the AIRA project (Windows double-click)

- Double-click `run-project.bat` to start the backend and open the site in your browser.
- Or right-click `run-project.ps1` and select "Run with PowerShell".

Notes:
- Ensure Node.js (v18+) is installed and on your PATH.
- The scripts copy `backend/.env.sample` to `backend/.env` if a `.env` is missing — edit the values to match your MySQL setup.
- The backend serves the frontend from `frontend/public` at `http://localhost:3000`.
- You must have a running MySQL server and the `aira_dbms` database. Use `database/aira_dbms_schema.sql` to create the schema if needed.
