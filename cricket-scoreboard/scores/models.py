from django.db import models

class Team(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Player(models.Model):
    name = models.CharField(max_length=100)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='players')

    def __str__(self):
        return f"{self.name} ({self.team.name})"

class Match(models.Model):
    STATUS_CHOICES = [
        ('UPCOMING', 'UPCOMING'),
        ('LIVE', 'LIVE'),
        ('FINISHED', 'FINISHED'),
    ]

    team_a = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='matches_as_team_a')
    team_b = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='matches_as_team_b')
    overs_limit = models.IntegerField(default=20)

    # team scores (existing)
    runs_team_a = models.IntegerField(default=0)
    wickets_team_a = models.IntegerField(default=0)
    overs_team_a = models.FloatField(default=0.0)
    runs_team_b = models.IntegerField(default=0)
    wickets_team_b = models.IntegerField(default=0)
    overs_team_b = models.FloatField(default=0.0)

    # new live-play fields
    striker_name = models.CharField(max_length=200, blank=True, default="")
    striker_runs = models.IntegerField(default=0)
    striker_balls = models.IntegerField(default=0)

    non_striker_name = models.CharField(max_length=200, blank=True, default="")
    non_striker_runs = models.IntegerField(default=0)
    non_striker_balls = models.IntegerField(default=0)

    bowler_name = models.CharField(max_length=200, blank=True, default="")
    bowler_balls = models.IntegerField(default=0)  
    bowler_overs = models.CharField(max_length=10, blank=True, default="0.0") 
    bowler_runs = models.IntegerField(default=0)
    bowler_wickets = models.IntegerField(default=0)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='UPCOMING')
    current_innings = models.IntegerField(default=1)
    target = models.IntegerField(default=0)
    dismissed_players = models.TextField(default="", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.team_a} vs {self.team_b}"

class Delivery(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='deliveries')
    innings = models.IntegerField(default=1)
    over_number = models.IntegerField(default=0)
    ball_number = models.IntegerField(default=1)
    striker = models.CharField(max_length=200)
    non_striker = models.CharField(max_length=200)
    bowler = models.CharField(max_length=200)
    runs = models.IntegerField(default=0)
    extra_type = models.CharField(max_length=10, blank=True, null=True)
    is_wicket = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.match.id} - Inn {self.innings} Ov {self.over_number}.{self.ball_number}"

