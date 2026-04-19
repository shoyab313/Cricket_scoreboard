from django.shortcuts import render

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Team, Player, Match
from .serializers import TeamSerializer, PlayerSerializer, MatchSerializer

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all().order_by('-created_at')
    serializer_class = MatchSerializer

    @action(detail=True, methods=['post'])
    def add_delivery(self, request, pk=None):
        """
        Handle a single delivery in the match.
        Expects JSON body:
        {
            "batting_team": "team_a" or "team_b",
            "runs": 0-6,
            "is_wicket": true/false
        }
        Updates: team runs/wickets/overs, striker stats, bowler stats.
        Automatically swaps striker/non-striker on odd runs or end of over.
        """
        match = self.get_object()

        if match.status != 'LIVE':
            return Response(
                {'error': 'Match is not live. Cannot add delivery.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        batting_team = request.data.get('batting_team', 'team_a')
        runs = int(request.data.get('runs', 0))
        is_wicket = bool(request.data.get('is_wicket', False))

        # --- Update team score ---
        if batting_team == 'team_a':
            match.runs_team_a += runs
            if is_wicket:
                match.wickets_team_a += 1
        else:
            match.runs_team_b += runs
            if is_wicket:
                match.wickets_team_b += 1

        # --- Update striker stats ---
        match.striker_runs += runs
        match.striker_balls += 1

        # --- Update bowler stats ---
        match.bowler_runs += runs
        match.bowler_balls += 1
        if is_wicket:
            match.bowler_wickets += 1

        # --- Calculate overs from bowler_balls ---
        completed_overs = match.bowler_balls // 6
        remaining_balls = match.bowler_balls % 6
        match.bowler_overs = f"{completed_overs}.{remaining_balls}"

        # --- Calculate team overs ---
        if batting_team == 'team_a':
            # We need to track total balls for team overs
            # Parse current overs to get total balls, add 1, then convert back
            current_overs = float(match.overs_team_a)
            total_balls = int(current_overs) * 6 + round((current_overs % 1) * 10)
            total_balls += 1
            new_completed = total_balls // 6
            new_remaining = total_balls % 6
            match.overs_team_a = float(f"{new_completed}.{new_remaining}")
        else:
            current_overs = float(match.overs_team_b)
            total_balls = int(current_overs) * 6 + round((current_overs % 1) * 10)
            total_balls += 1
            new_completed = total_balls // 6
            new_remaining = total_balls % 6
            match.overs_team_b = float(f"{new_completed}.{new_remaining}")

        # --- Swap striker/non-striker on odd runs ---
        swap_strike = False
        if runs in (1, 3):
            swap_strike = True

        # --- Swap at end of over (every 6 balls on the bowler) ---
        if remaining_balls == 0 and match.bowler_balls > 0:
            swap_strike = not swap_strike  # toggle again (if already swapped by odd run, cancel it)

        if swap_strike:
            # Swap names
            match.striker_name, match.non_striker_name = match.non_striker_name, match.striker_name
            # Swap runs
            match.striker_runs, match.non_striker_runs = match.non_striker_runs, match.striker_runs
            # Swap balls
            match.striker_balls, match.non_striker_balls = match.non_striker_balls, match.striker_balls

        match.save()

        serializer = self.get_serializer(match)
        return Response(serializer.data)
