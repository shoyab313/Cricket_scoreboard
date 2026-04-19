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

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get('team')
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all().order_by('-created_at')
    serializer_class = MatchSerializer

    @action(detail=True, methods=['post'])
    def add_delivery(self, request, pk=None):
        """
        Handles a delivery with support for Extras, Strike Rotation, and Wicket tracking.
        """
        match = self.get_object()
        if match.status != 'LIVE':
            return Response({'error': 'Match is not live.'}, status=status.HTTP_400_BAD_REQUEST)

        if match.current_innings == 1:
            batting_team = 'team_a'
        else:
            batting_team = 'team_b'

        runs = int(request.data.get('runs', 0))
        is_wicket = bool(request.data.get('is_wicket', False))
        extra_type = request.data.get('extra_type')
        new_batsman = request.data.get('new_batsman')
        new_bowler = request.data.get('new_bowler')
        switch_innings = bool(request.data.get('switch_innings', False))

        # --- Handle Innings Switch ---
        if switch_innings and match.current_innings == 1:
            match.current_innings = 2
            match.target = match.runs_team_a + 1
            match.striker_name = request.data.get('striker_name', "")
            match.non_striker_name = request.data.get('non_striker_name', "")
            match.bowler_name = request.data.get('bowler_name', "")
            match.striker_runs = 0; match.striker_balls = 0
            match.non_striker_runs = 0; match.non_striker_balls = 0
            match.bowler_runs = 0; match.bowler_balls = 0; match.bowler_wickets = 0; match.bowler_overs = "0.0"
            # Reset dismissed players for the 2nd innings (or keep them separated?)
            # Usually separate, but for simplicity we can just clear it or prefix them.
            # Let's just clear it as it's a new innings.
            match.dismissed_players = ""
            match.save()
            return Response(self.get_serializer(match).data)

        # --- Handle Player Replacements ---
        if new_batsman:
            if not match.striker_name:
                match.striker_name = new_batsman
                match.striker_runs = 0
                match.striker_balls = 0
            elif not match.non_striker_name:
                match.non_striker_name = new_batsman
                match.non_striker_runs = 0
                match.non_striker_balls = 0
            match.save()
            data = self.get_serializer(match).data
            data['need_new_batsman'] = not match.striker_name or not match.non_striker_name
            data['need_new_bowler'] = match.bowler_balls >= 6
            return Response(data)

        if new_bowler:
            match.bowler_name = new_bowler
            match.bowler_runs = 0
            match.bowler_balls = 0
            match.bowler_wickets = 0
            match.bowler_overs = "0.0"
            match.save()
            data = self.get_serializer(match).data
            data['need_new_batsman'] = not match.striker_name or not match.non_striker_name
            data['need_new_bowler'] = False
            return Response(data)

        # --- Logic for Extras ---
        is_legal_ball = True
        total_runs_to_add = runs
        if extra_type in ['wide', 'noball']:
            is_legal_ball = False
            total_runs_to_add += 1

        # --- Create Delivery Record ---
        from .models import Delivery
        # Use TEAM overs (not bowler overs) so the over_number is the actual match over
        target_overs_field = 'overs_team_a' if batting_team == 'team_a' else 'overs_team_b'
        team_overs_val = getattr(match, target_overs_field)
        over_num = int(team_overs_val)  # current over number (0-indexed)
        ball_num = match.bowler_balls % 6 + 1
        Delivery.objects.create(
            match=match,
            innings=match.current_innings,
            over_number=over_num,
            ball_number=ball_num,
            striker=match.striker_name,
            non_striker=match.non_striker_name,
            bowler=match.bowler_name,
            runs=runs,
            extra_type=extra_type,
            is_wicket=is_wicket
        )

        # --- Update Team Score & Track Wickets ---
        if batting_team == 'team_a':
            match.runs_team_a += total_runs_to_add
            if is_wicket:
                match.wickets_team_a += 1
                if match.striker_name:
                    d_list = [x.strip() for x in match.dismissed_players.split(',') if x.strip()]
                    d_list.append(match.striker_name)
                    match.dismissed_players = ",".join(d_list)
                match.striker_name = ""
        else:
            match.runs_team_b += total_runs_to_add
            if is_wicket:
                match.wickets_team_b += 1
                if match.striker_name:
                    d_list = [x.strip() for x in match.dismissed_players.split(',') if x.strip()]
                    d_list.append(match.striker_name)
                    match.dismissed_players = ",".join(d_list)
                match.striker_name = ""

        # --- Update Batsman Stats ---
        if extra_type != 'wide' and match.striker_name:
            match.striker_runs += runs
            if is_legal_ball:
                match.striker_balls += 1
        
        # --- Update Bowler Stats ---
        match.bowler_runs += total_runs_to_add
        if is_legal_ball:
            match.bowler_balls += 1
        if is_wicket:
            match.bowler_wickets += 1

        # --- Update Overs ---
        if is_legal_ball:
            completed_overs = match.bowler_balls // 6
            remaining_balls = match.bowler_balls % 6
            match.bowler_overs = f"{completed_overs}.{remaining_balls}"

            target_overs_field = 'overs_team_a' if batting_team == 'team_a' else 'overs_team_b'
            current_team_overs = getattr(match, target_overs_field)
            total_team_balls = int(current_team_overs) * 6 + round((current_team_overs % 1) * 10)
            total_team_balls += 1
            new_over_val = float(f"{total_team_balls // 6}.{total_team_balls % 6}")
            setattr(match, target_overs_field, new_over_val)

        # --- Strike Rotation ---
        if runs in [1, 3, 5]:
            match.striker_name, match.non_striker_name = match.non_striker_name, match.striker_name
            match.striker_runs, match.non_striker_runs = match.non_striker_runs, match.striker_runs
            match.striker_balls, match.non_striker_balls = match.non_striker_balls, match.striker_balls

        if is_legal_ball and match.bowler_balls == 6:
            match.striker_name, match.non_striker_name = match.non_striker_name, match.striker_name
            match.striker_runs, match.non_striker_runs = match.non_striker_runs, match.striker_runs
            match.striker_balls, match.non_striker_balls = match.non_striker_balls, match.striker_balls

        # --- Check for Completion ---
        innings_over = False
        match_finished = False
        current_wickets = match.wickets_team_a if batting_team == 'team_a' else match.wickets_team_b
        current_overs = match.overs_team_a if batting_team == 'team_a' else match.overs_team_b
        
        if current_wickets >= 10 or current_overs >= match.overs_limit:
            if match.current_innings == 1:
                innings_over = True
            else:
                match_finished = True
                match.status = 'FINISHED'

        if match.current_innings == 2 and match.runs_team_b >= match.target:
            match_finished = True
            match.status = 'FINISHED'

        match.save()
        data = self.get_serializer(match).data
        data['innings_over'] = innings_over
        data['match_finished'] = match_finished
        data['need_new_batsman'] = not match.striker_name or not match.non_striker_name
        data['need_new_bowler'] = match.bowler_balls >= 6
        return Response(data)

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        match = self.get_object()
        deliveries = match.deliveries.all().order_by('id')
        
        # Build stats
        def build_innings_stats(inn_num):
            inn_deliveries = deliveries.filter(innings=inn_num)
            batters = {}
            bowlers = {}
            overs = {}  # keyed by over_number from DB
            
            for d in inn_deliveries:
                # Batter stats
                if d.striker not in batters:
                    batters[d.striker] = {'name': d.striker, 'runs': 0, 'balls': 0, '4s': 0, '6s': 0, 'dismissed': False, 'dismissed_by': ''}
                
                is_legal = d.extra_type not in ['wide', 'noball'] if d.extra_type else True
                
                if d.extra_type != 'wide':
                    batters[d.striker]['runs'] += d.runs
                    if is_legal:
                        batters[d.striker]['balls'] += 1
                
                # Only count boundaries on legal deliveries or no-balls (not wides)
                if d.extra_type != 'wide':
                    if d.runs == 4: batters[d.striker]['4s'] += 1
                    if d.runs == 6: batters[d.striker]['6s'] += 1
                
                if d.is_wicket:
                    batters[d.striker]['dismissed'] = True
                    batters[d.striker]['dismissed_by'] = d.bowler
                
                # Also track non-striker if not already tracked
                if d.non_striker and d.non_striker not in batters:
                    batters[d.non_striker] = {'name': d.non_striker, 'runs': 0, 'balls': 0, '4s': 0, '6s': 0, 'dismissed': False, 'dismissed_by': ''}
                
                # Bowler stats
                if d.bowler not in bowlers:
                    bowlers[d.bowler] = {'name': d.bowler, 'overs': '0.0', 'balls': 0, 'runs': 0, 'wickets': 0}
                
                # Bowler concedes: runs off bat + 1 penalty for wide/noball
                bowler_runs_this_ball = d.runs
                if d.extra_type in ['wide', 'noball']:
                    bowler_runs_this_ball += 1
                bowlers[d.bowler]['runs'] += bowler_runs_this_ball
                
                if d.is_wicket: bowlers[d.bowler]['wickets'] += 1
                if is_legal: bowlers[d.bowler]['balls'] += 1
                
                # Overs breakdown — use over_number from DB, display as 1-indexed
                display_over = d.over_number + 1  # Convert 0-indexed to 1-indexed
                if display_over not in overs:
                    overs[display_over] = {'number': display_over, 'bowler': d.bowler, 'balls': []}
                
                ball_str = str(d.runs)
                if d.is_wicket: ball_str = 'W'
                elif d.extra_type == 'wide': ball_str = 'WD'
                elif d.extra_type == 'noball': ball_str = 'NB'
                overs[display_over]['balls'].append(ball_str)

            for b in bowlers.values():
                b['overs'] = f"{b['balls'] // 6}.{b['balls'] % 6}"
                
            return {
                'batters': list(batters.values()),
                'bowlers': list(bowlers.values()),
                'overs': sorted(overs.values(), key=lambda x: x['number'])
            }

        data = self.get_serializer(match).data
        data['innings_1'] = build_innings_stats(1)
        data['innings_2'] = build_innings_stats(2) if match.current_innings == 2 or match.status == 'FINISHED' else None
        
        return Response(data)
