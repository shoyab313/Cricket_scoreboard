import { useEffect, useState } from "react";
import {
  MantineProvider, Container, Title, Text, Card, Loader, Stack, Group, Badge, Button, Select, TextInput, Divider, Alert, Menu, ActionIcon, Table
} from "@mantine/core";
import { TEAMS } from "./data/teams";
import "flag-icons/css/flag-icons.min.css";
import "@mantine/core/styles.css";
import "./App.css";

const API = "http://127.0.0.1:8000/api";

const DUMMY_PLAYERS = [
  "Virat Kohli", "Rohit Sharma", "Jasprit Bumrah", "Steve Smith", "Pat Cummins",
  "Joe Root", "Ben Stokes", "Babar Azam", "Shaheen Afridi",
  "Quinton de Kock", "Kagiso Rabada", "Kane Williamson", "Trent Boult"
];

function getTeamInfo(name) {
  const t = TEAMS.find((team) => team.name === name);
  if (!t) return { name: name || "TBD", shortName: name ? String(name).slice(0, 3).toUpperCase() : "TBD", flag: "" };
  return t;
}

const RUN_BUTTONS = [
  { label: "0", runs: 0, color: "gray", variant: "light" },
  { label: "1", runs: 1, color: "blue", variant: "light" },
  { label: "2", runs: 2, color: "cyan", variant: "light" },
  { label: "3", runs: 3, color: "teal", variant: "light" },
  { label: "4", runs: 4, color: "orange", variant: "filled" },
  { label: "6", runs: 6, color: "red", variant: "filled" },
];

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [showForm, setShowForm] = useState(false);

  const [needNewBatsman, setNeedNewBatsman] = useState({});
  const [needNewBowler, setNeedNewBowler] = useState({});
  const [needInningsSwitch, setNeedInningsSwitch] = useState({});
  const [switchState, setSwitchState] = useState({ striker: null, nonStriker: null, bowler: null });

  const [lastDismissed, setLastDismissed] = useState({}); 

  // Toast notification state (non-blocking, unlike alert())
  const [notification, setNotification] = useState(null); // { message, color }
  const showNotification = (message, color = 'green') => {
    setNotification({ message, color });
    setTimeout(() => setNotification(null), 3000);
  };

  // Details View State
  const [viewDetailsId, setViewDetailsId] = useState(null);
  const [detailsData, setDetailsData] = useState(null);

  const [teams, setTeams] = useState([]);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [oversLimit, setOversLimit] = useState("20");
  const [status, setStatus] = useState("LIVE");
  const [playersA, setPlayersA] = useState([]);
  const [playersB, setPlayersB] = useState([]);
  const [striker, setStriker] = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState(null);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const refreshMatches = async () => {
    try {
      const res = await fetch(`${API}/matches/`);
      const data = await res.json();
      setMatches(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { refreshMatches(); }, []);

  const [allPlayers, setAllPlayers] = useState([]);

  useEffect(() => {
    if (showForm) {
      fetch(`${API}/teams/`).then(r => r.json()).then(data => {
        setTeams(data.length > 0 ? data : TEAMS.map((t, idx) => ({ id: idx + 1, name: t.name })));
      }).catch(() => setTeams(TEAMS.map((t, idx) => ({ id: idx + 1, name: t.name }))));
    }
  }, [showForm]);

  useEffect(() => {
    fetch(`${API}/players/`).then(r => r.json()).then(setAllPlayers).catch(console.error);
  }, []);

  // Update playersA and playersB dynamically for the form
  useEffect(() => {
    if (teamA) {
      const filtered = allPlayers.filter(p => String(p.team) === String(teamA));
      setPlayersA(filtered.length ? filtered : DUMMY_PLAYERS.map(n => ({ name: n })));
    }
  }, [teamA, allPlayers]);

  useEffect(() => {
    if (teamB) {
      const filtered = allPlayers.filter(p => String(p.team) === String(teamB));
      setPlayersB(filtered.length ? filtered : DUMMY_PLAYERS.map(n => ({ name: n })));
    }
  }, [teamB, allPlayers]);

  const handleAddDelivery = async (matchId, runs, isWicket, extraType = null, extraParams = {}) => {
    setActionLoading(p => ({ ...p, [matchId]: true }));
    try {
      const matchObj = matches.find(m => m.id === matchId);
      if (isWicket) setLastDismissed(p => ({ ...p, [matchId]: matchObj.striker_name }));

      const res = await fetch(`${API}/matches/${matchId}/add_delivery/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runs, is_wicket: isWicket, extra_type: extraType, ...extraParams }),
      });
      const data = await res.json();
      setMatches(p => p.map(m => (m.id === matchId ? data : m)));

      if (data.innings_over) {
        setNeedInningsSwitch(p => ({ ...p, [matchId]: true }));
      } else {
        setNeedNewBatsman(p => ({ ...p, [matchId]: data.need_new_batsman }));
        setNeedNewBowler(p => ({ ...p, [matchId]: data.need_new_bowler }));
        if (extraParams.switch_innings) setNeedInningsSwitch(p => ({ ...p, [matchId]: false }));
      }
      
      if (!data.need_new_batsman) setLastDismissed(p => ({ ...p, [matchId]: null }));
    } catch (err) { alert(err.message); }
    finally { setActionLoading(p => ({ ...p, [matchId]: false })); }
  };

  const handleSwitchInnings = async (matchId) => {
    const { striker, nonStriker, bowler } = switchState;
    if (!striker || !nonStriker || !bowler) return;
    await handleAddDelivery(matchId, 0, false, null, { switch_innings: true, striker_name: striker, non_striker_name: nonStriker, bowler_name: bowler });
    setSwitchState({ striker: null, nonStriker: null, bowler: null });
  };

  const handleDeleteMatch = async (id) => {
    if (!window.confirm("Are you sure you want to delete this match? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/matches/${id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete match");
      // Immediately remove from state — UI updates before any notification
      setMatches(prev => prev.filter(m => m.id !== id));
      if (viewDetailsId === id) setViewDetailsId(null);
      showNotification("✅ Match deleted successfully!");
    } catch (err) {
      showNotification("❌ Failed to delete match: " + err.message, "red");
    }
  };

  const handleViewDetails = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/matches/${id}/details/`);
      const data = await res.json();
      setDetailsData(data);
      setViewDetailsId(id);
    } catch (err) { alert("Failed to fetch details"); }
    finally { setLoading(false); }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerTeam) return;
    setAddingPlayer(true);
    try {
      await fetch(`${API}/players/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPlayerName.trim(), team: parseInt(newPlayerTeam) }) });
      if (newPlayerTeam === teamA) fetch(`${API}/players/?team=${teamA}`).then(r => r.json()).then(setPlayersA);
      else fetch(`${API}/players/?team=${teamB}`).then(r => r.json()).then(setPlayersB);
      setNewPlayerName("");
    } catch (e) { setFormError(e.message); }
    finally { setAddingPlayer(false); }
  };

  const handleSubmitMatch = async () => {
    if (!teamA || !teamB || !striker || !nonStriker || !bowler) { setFormError("All selections required"); return; }
    setSubmitting(true);
    try {
      const body = { team_a: parseInt(teamA), team_b: parseInt(teamB), overs_limit: parseInt(oversLimit), status, striker_name: striker, non_striker_name: nonStriker, bowler_name: bowler };
      const res = await fetch(`${API}/matches/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      await refreshMatches();
      setShowForm(false);
    } catch (e) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="app-bg"><Loader size="lg" /></div>;

  if (viewDetailsId && detailsData) {
    const tA = getTeamInfo(detailsData.team_a_name);
    const tB = getTeamInfo(detailsData.team_b_name);
    const isLive = detailsData.status === "LIVE";
    const matchType = detailsData.overs_limit === 20 ? "T20" : detailsData.overs_limit === 50 ? "ODI" : `Custom (${detailsData.overs_limit} ov)`;

    const renderInnings = (innData, innNum) => {
      if (!innData) return null;
      const battingTeam = innNum === 1 ? tA : tB;
      const bowlingTeam = innNum === 1 ? tB : tA;
      const runs = innNum === 1 ? detailsData.runs_team_a : detailsData.runs_team_b;
      const wkts = innNum === 1 ? detailsData.wickets_team_a : detailsData.wickets_team_b;
      const overs = innNum === 1 ? detailsData.overs_team_a : detailsData.overs_team_b;

      return (
        <Card shadow="sm" p="lg" radius="md" withBorder mt="md" key={innNum}>
          <Group justify="space-between" mb="md">
            <Title order={3}>Innings {innNum}: {battingTeam.name}</Title>
            <Title order={3}>{runs}/{wkts} <Text span size="sm" color="dimmed">({overs} ov)</Text></Title>
          </Group>
          
          <Text fw={700} color="blue" mb="xs">Batting</Text>
          <Table striped mb="xl" className="custom-table">
            <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead>
            <tbody>
              {innData.batters.map(b => (
                <tr key={b.name}>
                  <td>
                    <Text fw={600}>{b.name}</Text>
                    {b.dismissed ? <Text size="xs" color="dimmed">b {b.dismissed_by}</Text> : <Text size="xs" color="green">not out</Text>}
                  </td>
                  <td style={{fontWeight: 700}}>{b.runs}</td><td>{b.balls}</td><td>{b['4s']}</td><td>{b['6s']}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Text fw={700} color="green" mb="xs">Bowling</Text>
          <Table striped mb="xl" className="custom-table">
            <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead>
            <tbody>
              {innData.bowlers.map(b => (
                <tr key={b.name}>
                  <td><Text fw={600}>{b.name}</Text></td>
                  <td>{b.overs}</td><td>{b.runs}</td><td style={{fontWeight: 700}}>{b.wickets}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Text fw={700} color="orange" mb="xs">Over-by-Over Details</Text>
          <Stack gap="xs">
            {innData.overs.map(o => (
              <Group key={o.number} align="center" style={{background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: '8px'}}>
                <Text size="sm" fw={700} style={{minWidth: 50}}>Ov {o.number}</Text>
                <Text size="sm" color="dimmed" style={{minWidth: 100}}>{o.bowler}</Text>
                <Group gap="4px">
                  {o.balls.map((b, i) => (
                     <Badge key={i} size="sm" color={b === 'W' ? 'red' : ['WD','NB'].includes(b) ? 'orange' : 'gray'} variant="filled">{b}</Badge>
                  ))}
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>
      );
    };

    return (
      <MantineProvider>
        <div className="app-bg">
          <Container className="app-content" py="xl" style={{maxWidth: 800}}>
            <Group justify="space-between" mb="md">
              <Button variant="light" color="white" onClick={() => { setViewDetailsId(null); refreshMatches(); }}>← Back to Dashboard</Button>
              <Title order={2} className="title-white">Match Details</Title>
            </Group>

            <Card shadow="md" p="lg" radius="md" withBorder mb="lg">
              <Group justify="space-between">
                <Title order={3}><span className={`fi fi-${tA.flag} flag-icon`} />{tA.shortName} vs <span className={`fi fi-${tB.flag} flag-icon`} />{tB.shortName}</Title>
                <Badge color={detailsData.status === "FINISHED" ? "red" : isLive ? "green" : "gray"}>{detailsData.status}</Badge>
              </Group>
              <Text size="sm" color="dimmed" mt="xs">{matchType} Match</Text>
              
              {detailsData.status === "FINISHED" && (
                <Alert mt="md" color="blue" title="Result">
                  <Text fw={700}>
                    {detailsData.runs_team_b >= detailsData.target ? `${tB.name} won by ${10 - detailsData.wickets_team_b} wickets!` : 
                     detailsData.runs_team_a > detailsData.runs_team_b ? `${tA.name} won by ${detailsData.runs_team_a - detailsData.runs_team_b} runs!` : "Match Drawn!"}
                  </Text>
                </Alert>
              )}
            </Card>

            {renderInnings(detailsData.innings_1, 1)}
            {renderInnings(detailsData.innings_2, 2)}
            
          </Container>
        </div>
      </MantineProvider>
    );
  }

  const teamOpts = teams.map(t => ({ value: String(t.id), label: t.name }));
  const pAOpts = playersA.map(p => ({ value: p.name, label: p.name }));
  const pBOpts = playersB.map(p => ({ value: p.name, label: p.name }));

  return (
    <MantineProvider>
      <div className="app-bg">
        {/* Non-blocking toast notification */}
        {notification && (
          <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, padding: '12px 24px', borderRadius: 8,
            background: notification.color === 'red' ? '#ef4444' : '#22c55e',
            color: 'white', fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.3s ease'
          }}>
            {notification.message}
          </div>
        )}
        <Container className="app-content" py="xl">
          <Title order={1} mb="xl" className="title-white">Cricket Scoreboard</Title>
          <Button color={showForm ? "gray" : "green"} size="lg" fullWidth mb="xl" onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "＋ Add New Match"}</Button>

          {showForm && (
            <Card shadow="md" p="lg" radius="md" mb="xl" withBorder style={{ background: 'white' }}>
              <Title order={2} mb="md">Create New Match</Title>
              <Stack>
                {formError && <Text color="red">{formError}</Text>}
                <Group grow>
                  <Select label="Batting Team (1st Innings)" placeholder="Select" data={teamOpts} value={teamA} onChange={setTeamA} searchable />
                  <Select label="Bowling Team (1st Innings)" placeholder="Select" data={teamOpts} value={teamB} onChange={setTeamB} searchable />
                </Group>
                <Group grow>
                  <Select label="Format" data={[{value:"20",label:"T20 (20 ov)"},{value:"50",label:"ODI (50 ov)"},{value:"10",label:"T10 (10 ov)"}]} value={oversLimit} onChange={setOversLimit} />
                  <Select label="Status" data={[{value:"LIVE",label:"LIVE"},{value:"UPCOMING",label:"UPCOMING"}]} value={status} onChange={setStatus} />
                </Group>
                {teamA && teamB && (
                  <>
                    <Divider label="Initial Players" />
                    <Group grow>
                      <Select label="Striker" data={pAOpts} value={striker} onChange={setStriker} />
                      <Select label="Non-Striker" data={pAOpts.filter(o => o.value !== striker)} value={nonStriker} onChange={setNonStriker} />
                    </Group>
                    <Select label="Bowler" data={pBOpts} value={bowler} onChange={setBowler} />
                  </>
                )}
                <Button size="lg" mt="md" onClick={handleSubmitMatch} loading={submitting}>Create Match</Button>
              </Stack>
            </Card>
          )}

          <Stack>
            {matches.map((m) => {
              const tA = getTeamInfo(m.team_a_name);
              const tB = getTeamInfo(m.team_b_name);
              const is2ndInnings = m.current_innings === 2;
              const isLive = m.status === "LIVE";
              const matchType = m.overs_limit === 20 ? "T20" : m.overs_limit === 50 ? "ODI" : `Custom (${m.overs_limit} ov)`;
              
              const teamAPlayers = allPlayers.filter(p => p.team === m.team_a).map(p => ({ value: p.name, label: p.name }));
              const teamBPlayers = allPlayers.filter(p => p.team === m.team_b).map(p => ({ value: p.name, label: p.name }));
              
              const mPAOpts = teamAPlayers.length ? teamAPlayers : DUMMY_PLAYERS.map(n => ({ value: n, label: n }));
              const mPBOpts = teamBPlayers.length ? teamBPlayers : DUMMY_PLAYERS.map(n => ({ value: n, label: n }));

              const battingPlayers = is2ndInnings ? mPBOpts : mPAOpts;
              const bowlingPlayers = is2ndInnings ? mPAOpts : mPBOpts;

              const target = m.target;
              const currentRuns = is2ndInnings ? m.runs_team_b : m.runs_team_a;
              const currentOvers = is2ndInnings ? m.overs_team_b : m.overs_team_a;
              const totalBalls = m.overs_limit * 6;
              const ballsBowled = Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10);
              const ballsRemaining = totalBalls - ballsBowled;
              const runsNeeded = target - currentRuns;

              const showBatsmanSelect = needNewBatsman[m.id];
              const showBowlerSelect = needNewBowler[m.id];
              const showInningsSwitch = needInningsSwitch[m.id];

              const outPlayers = m.dismissed_players ? m.dismissed_players.split(',').map(s=>s.trim()) : [];
              const activePlayers = [m.striker_name, m.non_striker_name].filter(Boolean);
              const availableBatsmen = battingPlayers.filter(o => !activePlayers.includes(o.value) && !outPlayers.includes(o.value));

              return (
                <Card key={m.id} shadow="sm" p="lg" radius="md" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={0}>
                      <Title order={3}><span className={`fi fi-${tA.flag} flag-icon`} />{tA.shortName} vs <span className={`fi fi-${tB.flag} flag-icon`} />{tB.shortName}</Title>
                      <Text size="xs" color="dimmed" fw={700}>{matchType} Match</Text>
                    </Stack>
                    <Group gap="xs">
                      <Badge color={m.status === "FINISHED" ? "red" : isLive ? "green" : "gray"}>{m.status}</Badge>
                      <Menu shadow="md" width={150} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray"><Text size="lg" fw={800}>⋮</Text></ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item onClick={() => handleViewDetails(m.id)}>View Details</Menu.Item>
                          <Divider />
                          <Menu.Item color="red" onClick={() => handleDeleteMatch(m.id)}>Delete Match</Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>

                  {is2ndInnings && isLive && (
                    <Alert mt="md" color="blue" title="Chase in Progress">
                      <Text fw={700}>Target: {target} | Need {runsNeeded} runs from {ballsRemaining} balls</Text>
                    </Alert>
                  )}

                  <Group mt="md" grow>
                    <Stack gap={0} align="center" style={{opacity: is2ndInnings ? 0.5 : 1}}><Text size="xl" fw={700}>{m.runs_team_a}/{m.wickets_team_a}</Text><Text size="sm" color="dimmed">{tA.name} ({m.overs_team_a})</Text></Stack>
                    <Stack gap={0} align="center" style={{opacity: is2ndInnings ? 1 : 0.5}}><Text size="xl" fw={700}>{m.runs_team_b}/{m.wickets_team_b}</Text><Text size="sm" color="dimmed">{tB.name} ({m.overs_team_b})</Text></Stack>
                  </Group>

                  {isLive && (
                    <Stack mt="lg">
                      <Divider label={<Badge variant="outline" color="orange">Innings {m.current_innings}</Badge>} labelPosition="center" />
                      
                      {showInningsSwitch ? (
                        <Stack gap="md" p="md" style={{background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8}}>
                          <Title order={4} color="blue">Innings Over! Prepare for {tB.shortName} batting</Title>
                          <Group grow>
                            <Select label="Striker" placeholder="Choose" data={mPBOpts} onChange={(v)=>setSwitchState(s=>({...s, striker: v}))} />
                            <Select label="Non-Striker" placeholder="Choose" data={mPBOpts.filter(o=>o.value !== switchState.striker)} onChange={(v)=>setSwitchState(s=>({...s, nonStriker: v}))} />
                          </Group>
                          <Select label="Bowler" placeholder="Choose" data={mPAOpts} onChange={(v)=>setSwitchState(s=>({...s, bowler: v}))} />
                          <Button fullWidth onClick={()=>handleSwitchInnings(m.id)} disabled={!switchState.striker || !switchState.nonStriker || !switchState.bowler}>Start 2nd Innings</Button>
                        </Stack>
                      ) : (
                        <>
                          <Group grow>
                            <Stack gap={0} style={{opacity: showBatsmanSelect ? 0.4 : 1, filter: showBatsmanSelect ? 'blur(1px)' : 'none'}}>
                              <Text size="xs" color="blue" fw={700}>STRIKER {showBatsmanSelect && <Badge size="xs" color="red">OUT</Badge>}</Text>
                              <Text fw={600}>{showBatsmanSelect ? lastDismissed[m.id] : m.striker_name}*</Text>
                              <Text size="sm">{m.striker_runs}({m.striker_balls})</Text>
                            </Stack>
                            <Stack gap={0}><Text size="xs" color="dimmed" fw={700}>NON-STRIKER</Text><Text fw={600}>{m.non_striker_name}</Text><Text size="sm">{m.non_striker_runs}({m.non_striker_balls})</Text></Stack>
                            <Stack gap={0}><Text size="xs" color="green" fw={700}>BOWLER</Text><Text fw={600}>{m.bowler_name}</Text><Text size="sm">{m.bowler_wickets}-{m.bowler_runs} ({m.bowler_overs})</Text></Stack>
                          </Group>

                          {m.current_over_balls && m.current_over_balls.length > 0 && (
                            <Group gap="xs" mt="xs" align="center">
                              <Text size="xs" fw={700} color="dimmed">THIS OVER:</Text>
                              {m.current_over_balls.map((b, i) => (
                                <Badge key={i} size="sm" variant="filled" color={b === 'W' ? 'red' : ['WD','NB'].includes(b) ? 'orange' : 'gray'}>{b}</Badge>
                              ))}
                            </Group>
                          )}

                          <div className="scoring-panel">
                            {showBatsmanSelect ? (
                              <Stack gap="xs" p="xs" style={{background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8}}>
                                <Text size="sm" fw={700} color="red">Select New Batsman:</Text>
                                <Select placeholder="Choose player" 
                                  data={availableBatsmen} 
                                  onChange={(val) => val && handleAddDelivery(m.id, 0, false, null, { new_batsman: val })} />
                              </Stack>
                            ) : showBowlerSelect ? (
                              <Stack gap="xs" p="xs" style={{background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8}}>
                                <Text size="sm" fw={700} color="green">Over End! Select Next Bowler:</Text>
                                <Select placeholder="Choose bowler" data={bowlingPlayers.filter(o => o.value !== m.bowler_name)} 
                                  onChange={(val) => val && handleAddDelivery(m.id, 0, false, null, { new_bowler: val })} />
                              </Stack>
                            ) : (
                              <>
                                <Group gap="xs" justify="center">{RUN_BUTTONS.map(b => (<Button key={b.label} color={b.color} variant={b.variant} size="md" style={{minWidth:45}} onClick={() => handleAddDelivery(m.id, b.runs, false)} disabled={actionLoading[m.id]}>{b.label}</Button>))}</Group>
                                <Group grow mt="xs">
                                  <Button variant="outline" color="orange" size="sm" onClick={() => handleAddDelivery(m.id, 0, false, 'wide')} disabled={actionLoading[m.id]}>WIDE</Button>
                                  <Button variant="outline" color="cyan" size="sm" onClick={() => handleAddDelivery(m.id, 0, false, 'noball')} disabled={actionLoading[m.id]}>NO BALL</Button>
                                  <Button color="red" size="sm" onClick={() => handleAddDelivery(m.id, 0, true)} disabled={actionLoading[m.id]}>WICKET</Button>
                                </Group>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </Stack>
                  )}

                  {m.status === "FINISHED" && (
                    <Alert mt="md" color="red" title="Match Finished">
                      <Text fw={700}>
                        {m.runs_team_b >= m.target ? `${tB.name} won by ${10 - m.wickets_team_b} wickets!` : 
                         m.runs_team_a > m.runs_team_b ? `${tA.name} won by ${m.runs_team_a - m.runs_team_b} runs!` : "Match Drawn!"}
                      </Text>
                    </Alert>
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
