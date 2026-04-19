import { useEffect, useState } from "react";
import {
  MantineProvider,
  Container,
  Title,
  Text,
  Card,
  Loader,
  Stack,
  Group,
  Badge,
  Button,
  SegmentedControl,
} from "@mantine/core";
import { TEAMS } from "./data/teams";
import "flag-icons/css/flag-icons.min.css";
import "./app.css";

// helper: map full name from backend -> flag + shortName
function getTeamInfo(name) {
  const t = TEAMS.find((team) => team.name === name);
  if (!t) {
    return {
      name: name || "TBD",
      shortName: name ? String(name).slice(0, 3).toUpperCase() : "TBD",
      flag: "",
    };
  }
  return t;
}

function safeName(n) {
  return n && String(n).trim() !== "" ? String(n) : "TBD";
}

function strikerSummary(m) {
  const name = safeName(m.striker_name);
  const runs = Number.isFinite(m.striker_runs) ? m.striker_runs : 0;
  const balls = Number.isFinite(m.striker_balls) ? m.striker_balls : 0;
  return { name, stats: `${runs} (${balls})` };
}

function nonStrikerSummary(m) {
  const name = safeName(m.non_striker_name);
  const runs = Number.isFinite(m.non_striker_runs) ? m.non_striker_runs : 0;
  const balls = Number.isFinite(m.non_striker_balls) ? m.non_striker_balls : 0;
  return { name, stats: `${runs} (${balls})` };
}

function bowlerSummary(m) {
  const name = safeName(m.bowler_name);
  const overs =
    m.bowler_overs !== undefined && m.bowler_overs !== null
      ? String(m.bowler_overs)
      : "0.0";
  const runs = Number.isFinite(m.bowler_runs) ? m.bowler_runs : 0;
  const wickets = Number.isFinite(m.bowler_wickets) ? m.bowler_wickets : 0;
  return { name, stats: `${overs} overs • ${runs}-${wickets}` };
}

// Scoring button configs
const RUN_BUTTONS = [
  { label: "0", runs: 0, color: "gray", variant: "light", icon: "•" },
  { label: "1", runs: 1, color: "blue", variant: "light", icon: "" },
  { label: "2", runs: 2, color: "cyan", variant: "light", icon: "" },
  { label: "3", runs: 3, color: "teal", variant: "light", icon: "" },
  { label: "4", runs: 4, color: "orange", variant: "filled", icon: "🏏" },
  { label: "6", runs: 6, color: "red", variant: "filled", icon: "💥" },
];

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Track which team is batting for each match: { matchId: 'team_a' | 'team_b' }
  const [battingTeams, setBattingTeams] = useState({});
  // Track loading state per match for button feedback
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/matches/");
        if (!res.ok) {
          throw new Error("Failed to fetch matches");
        }
        const data = await res.json();
        setMatches(data);
        // Initialize batting team selection for each live match
        const initialBatting = {};
        data.forEach((m) => {
          if (m.status === "LIVE") {
            initialBatting[m.id] = "team_a";
          }
        });
        setBattingTeams(initialBatting);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleAddDelivery(matchId, runs, isWicket = false) {
    const battingTeam = battingTeams[matchId] || "team_a";
    setActionLoading((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/matches/${matchId}/add_delivery/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batting_team: battingTeam,
            runs: runs,
            is_wicket: isWicket,
          }),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update match");
      }
      const updatedMatch = await res.json();
      // Update the match in state
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? updatedMatch : m))
      );
    } catch (err) {
      console.error("Error adding delivery:", err);
      alert(err.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [matchId]: false }));
    }
  }

  if (loading)
    return (
      <MantineProvider>
        <div className="app-bg">
          <Container className="app-content app-container" py="xl">
            <Loader size="lg" />
            <Text mt="md">Loading matches...</Text>
          </Container>
        </div>
      </MantineProvider>
    );

  if (error)
    return (
      <MantineProvider>
        <div className="app-bg">
          <Container className="app-content app-container" py="xl">
            <Text color="red" size="lg">
              Error: {error}
            </Text>
          </Container>
        </div>
      </MantineProvider>
    );

  return (
    <MantineProvider>
      <div className="app-bg">
        <Container className="app-content app-container" py="xl">
          <Title order={1} mb="xl" className="title-white">
            Cricket Scoreboard
          </Title>

          {matches.length === 0 && <Text>No matches found.</Text>}

          <Stack className="app-stack">
            {matches.map((m) => {
              const teamA = getTeamInfo(m.team_a_name);
              const teamB = getTeamInfo(m.team_b_name);

              const striker = strikerSummary(m);
              const nonStriker = nonStrikerSummary(m);
              const bowler = bowlerSummary(m);

              const isLive = m.status === "LIVE";
              const currentBatting = battingTeams[m.id] || "team_a";
              const isLoading = actionLoading[m.id] || false;

              return (
                <Card
                  key={m.id}
                  shadow="md"
                  padding="lg"
                  radius="md"
                  withBorder
                >
                  <Title order={3}>
                    <span className={`fi fi-${teamA.flag} flag-icon`} />
                    {teamA.shortName} ({teamA.name}) vs{" "}
                    <span className={`fi fi-${teamB.flag} flag-icon`} />
                    {teamB.shortName} ({teamB.name})
                  </Title>

                  <Text mt="sm" fw={500}>
                    Status: {m.status || "TBD"}
                  </Text>

                  <Text mt="xs">
                    <span className={`fi fi-${teamA.flag} flag-icon`} />
                    {teamA.shortName}: <strong>{m.runs_team_a ?? 0}</strong> /{" "}
                    {m.wickets_team_a ?? 0} in {m.overs_team_a ?? "0.0"} overs
                  </Text>

                  <Text mt="xs">
                    <span className={`fi fi-${teamB.flag} flag-icon`} />
                    {teamB.shortName}: <strong>{m.runs_team_b ?? 0}</strong> /{" "}
                    {m.wickets_team_b ?? 0} in {m.overs_team_b ?? "0.0"} overs
                  </Text>

                  {/* --- BATTING + BOWLING (ALL THREE IN ONE ROW) --- */}
                  {/* --- THREE-COLUMN CENTERED ROW: STRIKER | NON-STRIKER | BOWLER --- */}
                  <div
                    style={{
                      marginTop: "1.4rem",
                      display: "flex",
                      flexDirection: "row",
                      gap: "2.5rem",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Striker */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: "140px",
                        textAlign: "center",
                        alignItems: "center",
                      }}
                    >
                      <Badge
                        variant="filled"
                        color="blue"
                        size="sm"
                        style={{ marginBottom: 6 }}
                      >
                        Striker
                      </Badge>
                      <Text weight={600} style={{ textAlign: "center" }}>
                        {striker.name}
                      </Text>
                      <Text
                        size="sm"
                        color="dimmed"
                        style={{ textAlign: "center" }}
                      >
                        {striker.stats}
                      </Text>
                    </div>

                    {/* Non-striker */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: "140px",
                        textAlign: "center",
                        alignItems: "center",
                      }}
                    >
                      <Badge
                        variant="outline"
                        color="blue"
                        size="sm"
                        style={{ marginBottom: 6 }}
                      >
                        Non-striker
                      </Badge>
                      <Text weight={600} style={{ textAlign: "center" }}>
                        {nonStriker.name}
                      </Text>
                      <Text
                        size="sm"
                        color="dimmed"
                        style={{ textAlign: "center" }}
                      >
                        {nonStriker.stats}
                      </Text>
                    </div>

                    {/* Bowler */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: "140px",
                        textAlign: "center",
                        alignItems: "center",
                      }}
                    >
                      <Badge
                        variant="light"
                        color="green"
                        size="sm"
                        style={{ marginBottom: 6 }}
                      >
                        Bowler
                      </Badge>
                      <Text weight={600} style={{ textAlign: "center" }}>
                        {bowler.name}
                      </Text>
                      <Text
                        size="sm"
                        color="dimmed"
                        style={{ textAlign: "center" }}
                      >
                        {bowler.stats}
                      </Text>
                    </div>
                  </div>

                  {/* ======= SCORING CONTROLS (only for LIVE matches) ======= */}
                  {isLive && (
                    <div className="scoring-panel">
                      {/* Batting Team Selector */}
                      <div className="scoring-section">
                        <Text size="sm" fw={600} mb={6} className="scoring-label">
                          Batting Team
                        </Text>
                        <SegmentedControl
                          value={currentBatting}
                          onChange={(val) =>
                            setBattingTeams((prev) => ({
                              ...prev,
                              [m.id]: val,
                            }))
                          }
                          data={[
                            {
                              label: `${teamA.shortName}`,
                              value: "team_a",
                            },
                            {
                              label: `${teamB.shortName}`,
                              value: "team_b",
                            },
                          ]}
                          size="sm"
                          color="blue"
                          fullWidth
                        />
                      </div>

                      {/* Run Buttons */}
                      <div className="scoring-section">
                        <Text size="sm" fw={600} mb={6} className="scoring-label">
                          Add Runs
                        </Text>
                        <Group gap="xs" justify="center" wrap="wrap">
                          {RUN_BUTTONS.map((btn) => (
                            <Button
                              key={btn.runs}
                              variant={btn.variant}
                              color={btn.color}
                              size="md"
                              className="score-btn"
                              disabled={isLoading}
                              onClick={() =>
                                handleAddDelivery(m.id, btn.runs, false)
                              }
                            >
                              {btn.icon && (
                                <span style={{ marginRight: 4 }}>
                                  {btn.icon}
                                </span>
                              )}
                              {btn.label}
                            </Button>
                          ))}
                        </Group>
                      </div>

                      {/* Wicket Button */}
                      <div className="scoring-section">
                        <Button
                          variant="filled"
                          color="red"
                          size="md"
                          fullWidth
                          className="wicket-btn"
                          disabled={isLoading}
                          onClick={() => handleAddDelivery(m.id, 0, true)}
                        >
                          🚨 Wicket
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Container>
      </div>
    </MantineProvider>
  );
}

export default App;
