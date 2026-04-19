from rest_framework import serializers
from .models import Team, Player, Match

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'

class PlayerSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = Player
        fields = ['id', 'name', 'team', 'team_name']

class MatchSerializer(serializers.ModelSerializer):
    team_a_name = serializers.CharField(source='team_a.name', read_only=True)
    team_b_name = serializers.CharField(source='team_b.name', read_only=True)
    current_over_balls = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id','team_a','team_b','team_a_name','team_b_name','overs_limit',
            'runs_team_a','wickets_team_a','overs_team_a',
            'runs_team_b','wickets_team_b','overs_team_b',
            'striker_name','striker_runs','striker_balls',
            'non_striker_name','non_striker_runs','non_striker_balls',
            'bowler_name','bowler_balls','bowler_overs','bowler_runs','bowler_wickets',
            'status','current_innings','target','dismissed_players','created_at',
            'current_over_balls'
        ]

    def get_current_over_balls(self, obj):
        if obj.status != 'LIVE':
            return []
        
        current_overs = obj.overs_team_a if obj.current_innings == 1 else obj.overs_team_b
        current_over_num = int(current_overs)
        active_over_deliveries = obj.deliveries.filter(innings=obj.current_innings, over_number=current_over_num).order_by('id')
        balls = []
        for d in active_over_deliveries:
            if d.is_wicket: balls.append('W')
            elif d.extra_type == 'wide': balls.append('WD')
            elif d.extra_type == 'noball': balls.append('NB')
            else: balls.append(str(d.runs))
        return balls
