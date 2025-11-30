# Cricket Scoreboard Application

A full-stack cricket scoreboard system built with **Django REST Framework (backend)** and **React + Mantine (frontend)**. The project supports team management, player management, match tracking, live match data, striker/non-striker/bowler statistics, and country‑based team mapping with flags.

---

## Features

### **Backend (Django + DRF)**
- Team model storing international cricket teams
- Player model linked to teams
- Match model with full scoring fields:
  - runs, wickets, overs for both teams
  - striker name, runs, balls
  - non‑striker name, runs, balls
  - bowler name, overs, balls, runs, wickets
- Automatic timestamps and match ordering
- Django admin integration with dropdowns for teams
- API endpoints via DRF ViewSets

### **Frontend (React)**
- Fetches match list from `/api/matches/`
- Uses custom TEAMS mapping for flag + shortName resolution
- Displays each match in a Mantine Card
- Shows:
  - Teams with flags
  - Match status
  - Team scores and overs
  - Striker + Non‑striker + Bowler in a centered 3‑column layout

---

## Folder Structure
```
CRICKET-SCOREBOARD/
│
├── backend/
│   ├── scores/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── admin.py
│   ├── manage.py
│   └── db.sqlite3
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── data/teams.js
│   │   └── app.css
│   └── package.json
```

---

# Backend (Django)

## Install Dependencies
```
pip install django djangorestframework
```

## Django App: `scores`

### **Models**
`Team`, `Player`, and `Match` models are defined with all required scoring fields.

### **Team Model**
Contains country names used in admin dropdowns and frontend mapping.

### **Match Model**
Includes:
- `striker_name`, `striker_runs`, `striker_balls`
- `non_striker_name`, `non_striker_runs`, `non_striker_balls`
- `bowler_name`, `bowler_overs`, `bowler_balls`, `bowler_runs`, `bowler_wickets`
- `STATUS_CHOICES = UPCOMING | LIVE | FINISHED`

### **Serializers**
Expose all model fields and include `team_a_name` and `team_b_name` from relationships.

### **ViewSets**
```
/api/teams/
/api/players/
/api/matches/
```

### Create Default Country Teams
Open Django shell:
```
python manage.py shell
```

```
from scores.models import Team
countries = [
    "India","Australia","England","Pakistan","New Zealand",
    "South Africa","Sri Lanka","Bangladesh","Afghanistan",
    "West Indies","Ireland","Zimbabwe","Netherlands",
    "Nepal","United Arab Emirates"
]

for c in countries:
    Team.objects.update_or_create(name=c)
```

### Apply Migrations
```
python manage.py makemigrations
python manage.py migrate
```

---

# Frontend (React)

## Install Dependencies
```
npm install @mantine/core flag-icons
```

## `TEAMS` Mapping
Located at:
```
src/data/teams.js
```
Contains:
- id
- name
- shortName
- flag (ISO country code for flag-icons)

## Display Logic
The frontend resolves teams via `getTeamInfo(name)`.

The scoreboard card shows:
- Country flags
- Team short names & full names
- Runs / wickets / overs
- Striker
- Non-striker
- Bowler

### **Three-column layout block (center aligned)**
```jsx
<div
  style={{
    marginTop: "1.4rem",
    display: "flex",
    flexDirection: "row",
    gap: "2.5rem",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    flexWrap: "wrap"
  }}
>
  <div style={{ display: "flex", flexDirection: "column", minWidth: "140px", textAlign: "center", alignItems: "center" }}>
    <Badge variant="filled" color="blue" size="sm" style={{ marginBottom: 6 }}>Striker</Badge>
    <Text weight={600}>{striker.name}</Text>
    <Text size="sm" color="dimmed">{striker.stats}</Text>
  </div>

  <div style={{ display: "flex", flexDirection: "column", minWidth: "140px", textAlign: "center", alignItems: "center" }}>
    <Badge variant="outline" color="blue" size="sm" style={{ marginBottom: 6 }}>Non-striker</Badge>
    <Text weight={600}>{nonStriker.name}</Text>
    <Text size="sm" color="dimmed">{nonStriker.stats}</Text>
  </div>

  <div style={{ display: "flex", flexDirection: "column", minWidth: "140px", textAlign: "center", alignItems: "center" }}>
    <Badge variant="light" color="green" size="sm" style={{ marginBottom: 6 }}>Bowler</Badge>
    <Text weight={600}>{bowler.name}</Text>
    <Text size="sm" color="dimmed">{bowler.stats}</Text>
  </div>
</div>
```

---

# API Response Example
```json
{
  "id": 1,
  "team_a": 1,
  "team_b": 2,
  "team_a_name": "India",
  "team_b_name": "Australia",
  "runs_team_a": 150,
  "wickets_team_a": 3,
  "overs_team_a": "18.2",
  "striker_name": "Rohit Sharma",
  "striker_runs": 45,
  "striker_balls": 32,
  "bowler_name": "Starc",
  "bowler_overs": "3.0",
  "bowler_runs": 22,
  "bowler_wickets": 1,
  "status": "LIVE"
}
```

---

# Docker Support
The project can be containerized using Docker. Typical setup:
```
Dockerfile
docker-compose.yml
```
Backend runs on port **8000**, frontend on **3000**.

---

# Running the Project

## Backend
```
cd backend
python manage.py runserver
```

## Frontend
```
cd frontend
npm install
npm start
```

App runs at:
```
http://localhost:3000
```
Backend API:
```
http://127.0.0.1:8000/api/matches/
```

---

# Summary
This project provides a complete cricket scoreboard system including:
- Country-based team selection
- Full match stats including batsmen and bowler details
- Clean React UI with flags and Mantine components
- Django backend with full CRUD API using DRF
- Expandable architecture for live scoring or streaming

This README compiles all context across the entire build process and linked chat history.

