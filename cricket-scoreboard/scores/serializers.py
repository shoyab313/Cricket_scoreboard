from rest_framework import serializers
from .models import Team, Player, Match

class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = '__all__'

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = '__all__'

class MatchSerializer(serializers.ModelSerializer):
    team_a_name = serializers.CharField(source='team_a.name', read_only=True)
    team_b_name = serializers.CharField(source='team_b.name', read_only=True)

    class Meta:
        model = Match
        fields = [
            'id','team_a','team_b','team_a_name','team_b_name','overs_limit',
            'runs_team_a','wickets_team_a','overs_team_a',
            'runs_team_b','wickets_team_b','overs_team_b',
            'striker_name','striker_runs','striker_balls',
            'non_striker_name','non_striker_runs','non_striker_balls',
            'bowler_name','bowler_balls','bowler_overs','bowler_runs','bowler_wickets',
            'status','created_at'
        ]
