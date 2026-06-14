Docker Compose setup (MySQL + backend)

1. Configure credentials
- Edit `docker-compose.yml` and replace `root_change_me` and `aira_password_change_me` with secure passwords.

2. Build and run
```bash
docker compose up --build
```

3. What it does
- MySQL initializes the `aira_dbms` database using `database/aira_dbms_schema.sql`.
- Backend mounts the local `backend` folder and runs `npm run dev`, listening on `http://localhost:3000`.

4. Notes
- If you already have a local MySQL on port 3306, stop it or change the port mapping in `docker-compose.yml`.
- After the containers start, update `backend/.env` (or rely on the compose env) so local runs have matching DB credentials.
