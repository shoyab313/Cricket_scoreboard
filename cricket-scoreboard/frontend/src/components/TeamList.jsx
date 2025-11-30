import { TEAMS } from "./data/teams";
import "flag-icons/css/flag-icons.min.css";

function TeamList() {
  return (
    <ul>
      {TEAMS.map((team) => (
        <li key={team.id}>
          <span className={`fi fi-${team.flag} flag-icon`} />{" "}
          {team.name} ({team.shortName})
        </li>
      ))}
    </ul>
  );
}

export default TeamList;
