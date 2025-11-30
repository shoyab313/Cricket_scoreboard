import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

export const getMatches = () => api.get("/matches/");
export const createMatch = (data) => api.post("/matches/", data);
export const updateMatch = (id, data) => api.patch(`/matches/${id}/`, data);

export const getTeams = () => api.get("/teams/");
export const createTeam = (data) => api.post("/teams/", data);

export default api;
